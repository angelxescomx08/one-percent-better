import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { userAccess } from "~/server/db/schema";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
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
        const subscriptionResponse = await stripe.subscriptions.retrieve(
          access.stripeSubscriptionId,
          {
            expand: ["items.data.price.product"],
          },
        );

        // El resultado puede ser Subscription directamente o Response<Subscription>
        const subscription = subscriptionResponse as Stripe.Subscription;

        const price = subscription.items.data[0]?.price;
        const product = price?.product as Stripe.Product | undefined;

        return {
          type: "subscription" as const,
          hasLifetimeAccess: false,
          trialEndsAt: access.trialEndsAt,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: (
              subscription as unknown as { current_period_end: number }
            ).current_period_end,
            currentPeriodStart: (
              subscription as unknown as { current_period_start: number }
            ).current_period_start,
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
      const customer = await stripe.customers.retrieve(access.stripeCustomerId);

      const defaultPaymentMethodId =
        typeof customer === "object" && !customer.deleted
          ? typeof customer.invoice_settings.default_payment_method === "string"
            ? customer.invoice_settings.default_payment_method
            : (customer.invoice_settings.default_payment_method?.id ?? null)
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
    const access = await db.query.userAccess.findFirst({
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

  // Obtener precios del producto desde Stripe
  getProductPrices: protectedProcedure.query(async () => {
    try {
      // Obtener todos los precios activos
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
      });

      // Agrupar por tipo: lifetime, monthly, yearly
      const lifetimePrices: Stripe.Price[] = [];
      const monthlyPrices: Stripe.Price[] = [];
      const yearlyPrices: Stripe.Price[] = [];

      for (const price of prices.data) {
        if (!price.recurring) {
          // Es un precio único (lifetime)
          lifetimePrices.push(price);
        } else if (price.recurring.interval === "month") {
          monthlyPrices.push(price);
        } else if (price.recurring.interval === "year") {
          yearlyPrices.push(price);
        }
      }

      // Formatear los precios
      const formatPrice = (price: Stripe.Price) => {
        const product = price.product as Stripe.Product | undefined;
        return {
          id: price.id,
          amount: price.unit_amount ?? 0,
          currency: price.currency,
          type: price.recurring ? "subscription" : "one_time",
          interval: price.recurring?.interval,
          product: {
            id: product?.id,
            name: product?.name,
            description: product?.description,
          },
        };
      };

      return {
        lifetime: lifetimePrices.map(formatPrice),
        monthly: monthlyPrices.map(formatPrice),
        yearly: yearlyPrices.map(formatPrice),
      };
    } catch (error) {
      console.error("Error al obtener precios:", error);
      throw new Error("Error al obtener precios del producto");
    }
  }),

  // Crear payment intent para compra de por vida
  createLifetimePaymentIntent: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Obtener acceso del usuario
      const access = await db.query.userAccess.findFirst({
        where: eq(userAccess.userId, userId),
      });

      if (!access) {
        throw new Error("No se encontró el acceso del usuario");
      }

      // Verificar que no tenga ya acceso de por vida
      if (access.hasLifetimeAccess) {
        throw new Error("Ya tienes acceso de por vida");
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

        // Obtener el precio
        const price = await stripe.prices.retrieve(input.priceId);

        if (price.recurring) {
          throw new Error("El precio seleccionado no es un pago único");
        }

        // Crear payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price.unit_amount ?? 0,
          currency: price.currency,
          customer: customerId,
          metadata: {
            userId: userId,
            priceId: input.priceId,
            type: "lifetime",
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      } catch (error) {
        console.error("Error al crear payment intent:", error);
        throw new Error("Error al crear payment intent");
      }
    }),

  // Crear suscripción (mensual o anual)
  createSubscription: protectedProcedure
    .input(
      z.object({
        priceId: z.string(),
        paymentMethodId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Obtener acceso del usuario
      const access = await db.query.userAccess.findFirst({
        where: eq(userAccess.userId, userId),
      });

      if (!access) {
        throw new Error("No se encontró el acceso del usuario");
      }

      // Verificar que no tenga ya acceso de por vida
      if (access.hasLifetimeAccess) {
        throw new Error(
          "Ya tienes acceso de por vida, no necesitas suscripción",
        );
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

        // Obtener el precio
        const price = await stripe.prices.retrieve(input.priceId);

        if (!price.recurring) {
          throw new Error("El precio seleccionado no es una suscripción");
        }

        // Si ya tiene una suscripción activa, cancelarla primero
        if (access.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(access.stripeSubscriptionId);
          } catch (error) {
            console.error("Error al cancelar suscripción anterior:", error);
          }
        }

        // Crear la suscripción
        const subscriptionData: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [
            {
              price: input.priceId,
            },
          ],
          metadata: {
            userId: userId,
          },
        };

        // Si se proporciona un método de pago, usarlo
        if (input.paymentMethodId) {
          subscriptionData.default_payment_method = input.paymentMethodId;
        }

        const subscriptionResponse =
          await stripe.subscriptions.create(subscriptionData);

        // El resultado puede ser Subscription directamente o Response<Subscription>
        const subscription = subscriptionResponse as Stripe.Subscription;

        // Actualizar en la BD
        const currentPeriodEnd = (
          subscription as unknown as { current_period_end: number }
        ).current_period_end;
        const currentPeriodStart = (
          subscription as unknown as { current_period_start: number }
        ).current_period_start;

        await db
          .update(userAccess)
          .set({
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
            subscriptionCurrentPeriodStart: new Date(currentPeriodStart * 1000),
            subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(userAccess.userId, userId));

        // Obtener el invoice para el client secret si es necesario
        let clientSecret: string | null = null;
        if (subscription.latest_invoice) {
          const invoiceId =
            typeof subscription.latest_invoice === "string"
              ? subscription.latest_invoice
              : subscription.latest_invoice.id;

          if (invoiceId) {
            try {
              const invoiceResponse = await stripe.invoices.retrieve(
                invoiceId,
                {
                  expand: ["payment_intent"],
                },
              );
              const invoice = invoiceResponse as Stripe.Invoice;
              const paymentIntentValue = (
                invoice as unknown as {
                  payment_intent: string | Stripe.PaymentIntent | null;
                }
              ).payment_intent;
              const paymentIntent =
                typeof paymentIntentValue === "string" || !paymentIntentValue
                  ? null
                  : (paymentIntentValue as Stripe.PaymentIntent);
              clientSecret = paymentIntent?.client_secret ?? null;
            } catch (error) {
              console.error("Error al obtener invoice:", error);
            }
          }
        }

        return {
          subscriptionId: subscription.id,
          clientSecret,
        };
      } catch (error) {
        console.error("Error al crear suscripción:", error);
        throw new Error("Error al crear suscripción");
      }
    }),

  // Establecer método de pago después de agregar tarjeta
  setPaymentMethodFromSetupIntent: protectedProcedure
    .input(
      z.object({
        setupIntentId: z.string(),
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
        // Obtener el setup intent
        const setupIntent = await stripe.setupIntents.retrieve(
          input.setupIntentId,
        );

        if (!setupIntent.payment_method) {
          throw new Error(
            "No se encontró el método de pago en el setup intent",
          );
        }

        const paymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method.id;

        // Establecer como método de pago por defecto
        await stripe.customers.update(access.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return { success: true, paymentMethodId };
      } catch (error) {
        console.error("Error al establecer método de pago:", error);
        throw new Error("Error al establecer método de pago");
      }
    }),

  // Cancelar suscripción
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Obtener acceso del usuario
    const access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });

    if (!access?.stripeSubscriptionId) {
      throw new Error("No tienes una suscripción activa para cancelar");
    }

    try {
      // Cancelar la suscripción al final del periodo actual
      const subscription = await stripe.subscriptions.update(
        access.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      // Actualizar en la BD
      await db
        .update(userAccess)
        .set({
          subscriptionCancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(userAccess.userId, userId));

      const currentPeriodEnd = (
        subscription as unknown as { current_period_end: number }
      ).current_period_end;

      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: currentPeriodEnd,
      };
    } catch (error) {
      console.error("Error al cancelar suscripción:", error);
      throw new Error("Error al cancelar suscripción");
    }
  }),

  // Reactivar suscripción cancelada
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Obtener acceso del usuario
    const access = await db.query.userAccess.findFirst({
      where: eq(userAccess.userId, userId),
    });

    if (!access?.stripeSubscriptionId) {
      throw new Error("No tienes una suscripción para reactivar");
    }

    try {
      // Remover la cancelación programada
      const subscription = await stripe.subscriptions.update(
        access.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        },
      );

      // Actualizar en la BD
      await db
        .update(userAccess)
        .set({
          subscriptionCancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(userAccess.userId, userId));

      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      console.error("Error al reactivar suscripción:", error);
      throw new Error("Error al reactivar suscripción");
    }
  }),
});
