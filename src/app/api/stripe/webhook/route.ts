import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";
import { userAccess } from "~/server/db/schema";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

// Esta función maneja las peticiones POST del webhook de Stripe
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No se encontró la firma de Stripe" },
      { status: 400 },
    );
  }

  // Verificar el webhook secret - necesitarás agregar STRIPE_WEBHOOK_SECRET a tus variables de entorno
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error al verificar el webhook de Stripe:", error.message);
    return NextResponse.json(
      { error: `Error de verificación: ${error.message}` },
      { status: 400 },
    );
  }

  try {
    // Manejar diferentes tipos de eventos
    switch (event.type) {
      // Suscripción creada
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      // Suscripción actualizada (incluye cambios de estado, cancelaciones, etc.)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // Suscripción cancelada o eliminada
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // Pago exitoso de un payment intent (para acceso de por vida)
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      // Pago de factura exitoso
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      // Fallo en el pago de factura
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      // Reembolso procesado
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    return NextResponse.json(
      { error: "Error al procesar el webhook" },
      { status: 500 },
    );
  }
}

// Manejar suscripción creada
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  if (!customerId) {
    console.error("No se encontró customerId en la suscripción");
    return;
  }

  // Buscar el usuario por customerId o userId
  let access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (userId && !access) {
    access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });
  }

  if (!access) {
    console.error(
      `No se encontró acceso para el cliente ${customerId} o usuario ${userId}`,
    );
    return;
  }

  const currentPeriodEnd = (
    subscription as unknown as { current_period_end: number }
  ).current_period_end;
  const currentPeriodStart = (
    subscription as unknown as { current_period_start: number }
  ).current_period_start;

  // Actualizar el registro de acceso con la información de la suscripción
  await db
    .update(userAccess)
    .set({
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
      subscriptionCurrentPeriodStart: new Date(currentPeriodStart * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      updatedAt: new Date(),
    })
    .where(eq(userAccess.id, access.id));

  console.log(
    `Suscripción ${subscription.id} creada para usuario ${access.userId}`,
  );
}

// Manejar suscripción actualizada
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  if (!customerId) {
    console.error("No se encontró customerId en la suscripción");
    return;
  }

  const access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (!access) {
    console.error(`No se encontró acceso para el cliente ${customerId}`);
    return;
  }

  const currentPeriodEnd = (
    subscription as unknown as { current_period_end: number }
  ).current_period_end;
  const currentPeriodStart = (
    subscription as unknown as { current_period_start: number }
  ).current_period_start;

  // Actualizar el estado de la suscripción
  await db
    .update(userAccess)
    .set({
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
      subscriptionCurrentPeriodStart: new Date(currentPeriodStart * 1000),
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      updatedAt: new Date(),
    })
    .where(eq(userAccess.id, access.id));

  // Si la suscripción está cancelada, past_due o unpaid, limpiar datos
  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "past_due"
  ) {
    // No eliminamos la suscripción, solo marcamos el estado para que no tenga acceso
    console.log(
      `Suscripción ${subscription.id} actualizada a estado: ${subscription.status}`,
    );
  }

  console.log(
    `Suscripción ${subscription.id} actualizada para usuario ${access.userId}`,
  );
}

// Manejar suscripción eliminada
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  if (!customerId) {
    console.error("No se encontró customerId en la suscripción");
    return;
  }

  const access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (!access) {
    console.error(`No se encontró acceso para el cliente ${customerId}`);
    return;
  }

  // Actualizar el registro para reflejar que la suscripción fue cancelada
  await db
    .update(userAccess)
    .set({
      subscriptionStatus: "canceled",
      subscriptionCancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(userAccess.id, access.id));

  console.log(
    `Suscripción ${subscription.id} eliminada para usuario ${access.userId}`,
  );
}

// Manejar pago exitoso de payment intent (acceso de por vida)
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  // Verificar que sea un pago de acceso de por vida
  if (paymentIntent.metadata?.type !== "lifetime") {
    return;
  }

  const customerId = paymentIntent.customer as string;
  const userId = paymentIntent.metadata?.userId;

  if (!customerId && !userId) {
    console.error("No se encontró customerId ni userId en el payment intent");
    return;
  }

  // Buscar el usuario por customerId o userId
  let access = customerId
    ? await db.query.userAccess.findFirst({
      where: eq(userAccess.stripeCustomerId, customerId),
    })
    : null;

  if (userId && !access) {
    access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });
  }

  if (!access) {
    console.error(
      `No se encontró acceso para el cliente ${customerId} o usuario ${userId}`,
    );
    return;
  }

  // Activar acceso de por vida
  await db
    .update(userAccess)
    .set({
      hasLifetimeAccess: true,
      stripePaymentIntentId: paymentIntent.id,
      // Limpiar datos de suscripción si existen
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCurrentPeriodStart: null,
      subscriptionCancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(userAccess.id, access.id));

  console.log(
    `Acceso de por vida activado para usuario ${access.userId} con pago ${paymentIntent.id}`,
  );
}

// Manejar pago exitoso de factura
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const invoiceSubscription = (
    invoice as unknown as { subscription: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : (invoiceSubscription?.id ?? null);

  if (!customerId || !subscriptionId) {
    return;
  }

  const access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (!access) {
    console.error(`No se encontró acceso para el cliente ${customerId}`);
    return;
  }

  // Obtener la suscripción para actualizar los periodos
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentPeriodEnd = (
      subscription as unknown as { current_period_end: number }
    ).current_period_end;
    const currentPeriodStart = (
      subscription as unknown as { current_period_start: number }
    ).current_period_start;

    await db
      .update(userAccess)
      .set({
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        subscriptionCurrentPeriodStart: new Date(currentPeriodStart * 1000),
        updatedAt: new Date(),
      })
      .where(eq(userAccess.id, access.id));

    console.log(
      `Pago de factura exitoso para usuario ${access.userId}, suscripción ${subscriptionId}`,
    );
  } catch (error) {
    console.error(
      "Error al obtener suscripción en invoice.payment_succeeded:",
      error,
    );
  }
}

// Manejar fallo en el pago de factura
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const invoiceSubscription = (
    invoice as unknown as { subscription: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : (invoiceSubscription?.id ?? null);

  if (!customerId || !subscriptionId) {
    return;
  }

  const access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (!access) {
    console.error(`No se encontró acceso para el cliente ${customerId}`);
    return;
  }

  // Obtener la suscripción para verificar su estado
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Si la suscripción está en past_due o unpaid, actualizar el estado
    if (
      subscription.status === "past_due" ||
      subscription.status === "unpaid"
    ) {
      await db
        .update(userAccess)
        .set({
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        })
        .where(eq(userAccess.id, access.id));

      console.log(
        `Pago fallido para usuario ${access.userId}, suscripción en estado: ${subscription.status}`,
      );

      // Si después de varios intentos fallidos, Stripe cancela la suscripción
      // el evento customer.subscription.deleted será manejado por separado
    }
  } catch (error) {
    console.error(
      "Error al obtener suscripción en invoice.payment_failed:",
      error,
    );
  }
}

// Manejar reembolso
async function handleChargeRefunded(charge: Stripe.Charge) {
  const customerId = charge.customer as string;
  const paymentIntentId = charge.payment_intent as string;

  if (!customerId) {
    console.error("No se encontró customerId en el charge");
    return;
  }

  const access = await db.query.userAccess.findFirst({
    where: eq(userAccess.stripeCustomerId, customerId),
  });

  if (!access) {
    console.error(`No se encontró acceso para el cliente ${customerId}`);
    return;
  }

  // Si es un reembolso de un pago de acceso de por vida, desactivar el acceso
  if (
    access.stripePaymentIntentId === paymentIntentId &&
    access.hasLifetimeAccess
  ) {
    await db
      .update(userAccess)
      .set({
        hasLifetimeAccess: false,
        stripePaymentIntentId: null,
        updatedAt: new Date(),
      })
      .where(eq(userAccess.id, access.id));

    console.log(
      `Acceso de por vida desactivado por reembolso para usuario ${access.userId}`,
    );
    return;
  }

  // Si es un reembolso relacionado con una suscripción, cancelarla
  if (access.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        access.stripeSubscriptionId,
      );

      // Verificar si el invoice de esta suscripción fue reembolsado
      const invoices = await stripe.invoices.list({
        customer: customerId,
        subscription: access.stripeSubscriptionId,
        limit: 10,
      });

      const refundedInvoice = invoices.data.find((inv) => {
        const invPaymentIntentValue = (
          inv as unknown as {
            payment_intent: string | Stripe.PaymentIntent | null;
          }
        ).payment_intent;
        const invPaymentIntent =
          typeof invPaymentIntentValue === "string"
            ? invPaymentIntentValue
            : (invPaymentIntentValue?.id ?? null);
        return invPaymentIntent === paymentIntentId && inv.status === "void";
      });

      if (refundedInvoice) {
        // Cancelar la suscripción
        await stripe.subscriptions.cancel(access.stripeSubscriptionId);

        await db
          .update(userAccess)
          .set({
            subscriptionStatus: "canceled",
            subscriptionCancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(userAccess.id, access.id));

        console.log(
          `Suscripción cancelada por reembolso para usuario ${access.userId}`,
        );
      }
    } catch (error) {
      console.error("Error al manejar reembolso de suscripción:", error);
    }
  }
}
