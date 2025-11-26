import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Stripe from "stripe";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { userAccess } from "~/server/db/schema";
import { env } from "~/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const stripeRouter = createTRPCRouter({
  // Obtener información de membresía del usuario
  getMembership: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Obtener acceso del usuario desde la BD
    const access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });

    if (!access) {
      return {
        type: "trial" as const,
        hasLifetimeAccess: false,
        trialEndsAt: null,
        subscription: null,
      };
    }

    // Si tiene acceso de por vida
    if (access.hasLifetimeAccess) {
      return {
        type: "lifetime" as const,
        hasLifetimeAccess: true,
        trialEndsAt: access.trialEndsAt,
        subscription: null,
      };
    }

    // Si tiene suscripción activa
    if (access.stripeCustomerId && access.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          access.stripeSubscriptionId,
          {
            expand: ["items.data.price.product"],
          },
        );

        const price = subscription.items.data[0]?.price;
        const product = price?.product as Stripe.Product | undefined;

        return {
          type: "subscription" as const,
          hasLifetimeAccess: false,
          trialEndsAt: access.trialEndsAt,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            currentPeriodStart: subscription.currentPeriodStart,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            price: {
              id: price?.id,
              amount: price?.unit_amount,
              currency: price?.currency,
              interval: price?.recurring?.interval, // month, year
              intervalCount: price?.recurring?.interval_count,
            },
            product: {
              id: product?.id,
              name: product?.name,
              description: product?.description,
            },
          },
        };
      } catch (error) {
        console.error("Error al obtener suscripción de Stripe:", error);
        // Si hay error, devolver solo la info de la BD
        return {
          type: "trial" as const,
          hasLifetimeAccess: false,
          trialEndsAt: access.trialEndsAt,
          subscription: null,
        };
      }
    }

    // Si solo tiene trial
    return {
      type: "trial" as const,
      hasLifetimeAccess: false,
      trialEndsAt: access.trialEndsAt,
      subscription: null,
    };
  }),

  // Obtener métodos de pago del usuario
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Obtener acceso del usuario
    const access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });

    if (!access?.stripeCustomerId) {
      return {
        paymentMethods: [],
        defaultPaymentMethod: null,
      };
    }

    try {
      // Obtener métodos de pago del cliente
      const paymentMethods = await stripe.paymentMethods.list({
        customer: access.stripeCustomerId,
        type: "card",
      });

      // Obtener el método de pago por defecto del cliente
      const customer = await stripe.customers.retrieve(
        access.stripeCustomerId,
      );

      const defaultPaymentMethodId =
        typeof customer === "object" && !customer.deleted
          ? customer.invoice_settings.default_payment_method
          : null;

      const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
        isDefault: pm.id === defaultPaymentMethodId,
      }));

      return {
        paymentMethods: formattedPaymentMethods,
        defaultPaymentMethod: defaultPaymentMethodId,
      };
    } catch (error) {
      console.error("Error al obtener métodos de pago:", error);
      throw new Error("Error al obtener métodos de pago");
    }
  }),

  // Cambiar método de pago por defecto
  setDefaultPaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Obtener acceso del usuario
      const access = await db.query.userAccess.findFirst({
        where: eq(userAccess.userId, userId),
      });

      if (!access?.stripeCustomerId) {
        throw new Error("No se encontró el cliente de Stripe");
      }

      try {
        // Actualizar el método de pago por defecto en Stripe
        await stripe.customers.update(access.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: input.paymentMethodId,
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Error al cambiar método de pago por defecto:", error);
        throw new Error("Error al cambiar método de pago por defecto");
      }
    }),

  // Eliminar método de pago
  deletePaymentMethod: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Obtener acceso del usuario
      const access = await db.query.userAccess.findFirst({
        where: eq(userAccess.userId, userId),
      });

      if (!access?.stripeCustomerId) {
        throw new Error("No se encontró el cliente de Stripe");
      }

      try {
        // Verificar que el método de pago pertenece al cliente
        const paymentMethod = await stripe.paymentMethods.retrieve(
          input.paymentMethodId,
        );

        if (paymentMethod.customer !== access.stripeCustomerId) {
          throw new Error("El método de pago no pertenece a este usuario");
        }

        // Desasociar el método de pago del cliente
        await stripe.paymentMethods.detach(input.paymentMethodId);

        return { success: true };
      } catch (error) {
        console.error("Error al eliminar método de pago:", error);
        throw new Error("Error al eliminar método de pago");
      }
    }),

  // Crear setup intent para agregar nuevo método de pago
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Obtener acceso del usuario
    let access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });

    if (!access) {
      throw new Error("No se encontró el acceso del usuario");
    }

    try {
      let customerId = access.stripeCustomerId;

      // Si no tiene customer ID, crear uno
      if (!customerId) {
        const user = ctx.session.user;
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: userId,
          },
        });

        customerId = customer.id;

        // Actualizar en la BD
        await db
          .update(userAccess)
          .set({
            stripeCustomerId: customerId,
            updatedAt: new Date(),
          })
          .where(eq(userAccess.userId, userId));
      }

      // Crear setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
      });

      return {
        clientSecret: setupIntent.client_secret,
        customerId: customerId,
      };
    } catch (error) {
      console.error("Error al crear setup intent:", error);
      throw new Error("Error al crear setup intent");
    }
  }),
});

