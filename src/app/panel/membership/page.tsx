"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import {
  CreditCard,
  Crown,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { env } from "~/env";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Componente para agregar nuevo método de pago
function AddPaymentMethodForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe no está cargado correctamente");
      setIsProcessing(false);
      return;
    }

    try {
      // Confirmar el setup intent
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Error al agregar método de pago");
        setIsProcessing(false);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError("Error inesperado al procesar el pago");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="p-4 border rounded-md">
        <PaymentElement />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isProcessing || !stripe || !elements}>
          {isProcessing ? "Procesando..." : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MembershipPage() {
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<
    string | null
  >(null);

  // Queries
  const { data: membership, isLoading: isLoadingMembership } =
    api.stripe.getMembership.useQuery();
  const { data: paymentMethods, isLoading: isLoadingPaymentMethods } =
    api.stripe.getPaymentMethods.useQuery();

  // Mutations
  const utils = api.useUtils();
  const createSetupIntent = api.stripe.createSetupIntent.useMutation();
  const setDefaultPaymentMethod = api.stripe.setDefaultPaymentMethod.useMutation(
    {
      onSuccess: () => {
        void utils.stripe.getPaymentMethods.invalidate();
      },
    },
  );
  const deletePaymentMethod = api.stripe.deletePaymentMethod.useMutation({
    onSuccess: () => {
      void utils.stripe.getPaymentMethods.invalidate();
      setPaymentMethodToDelete(null);
    },
  });

  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<
    string | null
  >(null);

  const handleAddPaymentMethod = async () => {
    try {
      const result = await createSetupIntent.mutateAsync();
      setSetupIntentClientSecret(result.clientSecret);
      setShowAddPaymentMethod(true);
    } catch (error) {
      console.error("Error al crear setup intent:", error);
    }
  };

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentMethod(false);
    setSetupIntentClientSecret(null);
    void utils.stripe.getPaymentMethods.invalidate();
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await setDefaultPaymentMethod.mutateAsync({
        paymentMethodId,
      });
    } catch (error) {
      console.error("Error al cambiar método de pago por defecto:", error);
    }
  };

  const handleDeletePaymentMethod = async () => {
    if (!paymentMethodToDelete) return;
    try {
      await deletePaymentMethod.mutateAsync({
        paymentMethodId: paymentMethodToDelete,
      });
    } catch (error) {
      console.error("Error al eliminar método de pago:", error);
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: "Visa",
      mastercard: "Mastercard",
      amex: "American Express",
      discover: "Discover",
      jcb: "JCB",
      diners: "Diners Club",
      unionpay: "UnionPay",
    };
    return brands[brand] ?? brand;
  };

  const getMembershipStatusBadge = () => {
    if (!membership) return null;

    if (membership.type === "lifetime") {
      return (
        <Badge className="bg-amber-500 text-white">
          <Crown className="mr-1 h-3 w-3" />
          Acceso de por vida
        </Badge>
      );
    }

    if (membership.type === "subscription") {
      const statusColors: Record<string, string> = {
        active: "bg-green-500",
        past_due: "bg-yellow-500",
        canceled: "bg-gray-500",
        unpaid: "bg-red-500",
      };

      return (
        <Badge
          className={`${
            statusColors[membership.subscription?.status ?? ""] ?? "bg-gray-500"
          } text-white`}
        >
          {membership.subscription?.status === "active"
            ? "Activa"
            : membership.subscription?.status === "past_due"
              ? "Pago pendiente"
              : membership.subscription?.status === "canceled"
                ? "Cancelada"
                : "Inactiva"}
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Calendar className="mr-1 h-3 w-3" />
        Periodo de prueba
      </Badge>
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50/50 p-4 dark:bg-black md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Mi Membresía
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona tu suscripción y métodos de pago
          </p>
        </div>

        {/* Información de Membresía */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Estado de tu Membresía</CardTitle>
                <CardDescription>
                  Información sobre tu plan actual
                </CardDescription>
              </div>
              {isLoadingMembership ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                getMembershipStatusBadge()
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingMembership ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : membership ? (
              <>
                {membership.type === "lifetime" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">
                        Tienes acceso de por vida a la aplicación
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No necesitas realizar ningún pago adicional. Disfruta de
                      todas las funcionalidades sin límites.
                    </p>
                  </div>
                )}

                {membership.type === "subscription" && membership.subscription && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Plan
                        </p>
                        <p className="text-lg font-semibold">
                          {membership.subscription.product?.name ?? "Suscripción"}
                        </p>
                        {membership.subscription.product?.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {membership.subscription.product.description}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Precio
                        </p>
                        <p className="text-lg font-semibold">
                          {membership.subscription.price?.amount
                            ? `$${(
                                membership.subscription.price.amount / 100
                              ).toFixed(2)}`
                            : "N/A"}{" "}
                          {membership.subscription.price?.interval === "month"
                            ? "/mes"
                            : membership.subscription.price?.interval === "year"
                              ? "/año"
                              : ""}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Periodo actual
                        </p>
                        <p className="text-sm">
                          {membership.subscription.currentPeriodStart
                            ? format(
                                new Date(
                                  membership.subscription.currentPeriodStart *
                                    1000,
                                ),
                                "d 'de' MMMM, yyyy",
                                { locale: es },
                              )
                            : "N/A"}{" "}
                          -{" "}
                          {membership.subscription.currentPeriodEnd
                            ? format(
                                new Date(
                                  membership.subscription.currentPeriodEnd * 1000,
                                ),
                                "d 'de' MMMM, yyyy",
                                { locale: es },
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          Próximo pago
                        </p>
                        <p className="text-sm">
                          {membership.subscription.currentPeriodEnd
                            ? format(
                                new Date(
                                  membership.subscription.currentPeriodEnd * 1000,
                                ),
                                "d 'de' MMMM, yyyy",
                                { locale: es },
                              )
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {membership.subscription.cancelAtPeriodEnd && (
                      <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                              Suscripción cancelada
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Tu suscripción se cancelará al final del periodo
                              actual. Seguirás teniendo acceso hasta{" "}
                              {membership.subscription.currentPeriodEnd
                                ? format(
                                    new Date(
                                      membership.subscription.currentPeriodEnd *
                                        1000,
                                    ),
                                    "d 'de' MMMM, yyyy",
                                    { locale: es },
                                  )
                                : "N/A"}
                              .
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {membership.type === "trial" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Periodo de prueba activo</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Tu periodo de prueba{" "}
                      {membership.trialEndsAt
                        ? `termina el ${format(
                            membership.trialEndsAt,
                            "d 'de' MMMM, yyyy",
                            { locale: es },
                          )}`
                        : "ha terminado"}
                      . Considera suscribirte para continuar disfrutando de
                      todas las funcionalidades.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400">
                No se pudo cargar la información de membresía
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métodos de Pago */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>
                  Gestiona tus tarjetas de crédito y débito
                </CardDescription>
              </div>
              <Button
                onClick={handleAddPaymentMethod}
                disabled={createSetupIntent.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Tarjeta
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPaymentMethods ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : paymentMethods?.paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <CreditCard className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No tienes métodos de pago guardados</p>
                <p className="text-sm mt-1">
                  Agrega una tarjeta para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods?.paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                        <CreditCard className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {pm.card
                              ? `${formatCardBrand(pm.card.brand)} •••• ${pm.card.last4}`
                              : "Tarjeta"}
                          </p>
                          {pm.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Por defecto
                            </Badge>
                          )}
                        </div>
                        {pm.card && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Expira {pm.card.expMonth}/{pm.card.expYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!pm.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(pm.id)}
                          disabled={setDefaultPaymentMethod.isPending}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Usar por defecto
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentMethodToDelete(pm.id)}
                        disabled={deletePaymentMethod.isPending}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo para agregar método de pago */}
        <Dialog
          open={showAddPaymentMethod}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddPaymentMethod(false);
              setSetupIntentClientSecret(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar método de pago</DialogTitle>
              <DialogDescription>
                Ingresa los datos de tu tarjeta para agregarla como método de
                pago
              </DialogDescription>
            </DialogHeader>
            {setupIntentClientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: setupIntentClientSecret,
                  appearance: {
                    theme: "stripe",
                  },
                }}
              >
                <AddPaymentMethodForm
                  clientSecret={setupIntentClientSecret}
                  onSuccess={handlePaymentMethodAdded}
                  onCancel={() => {
                    setShowAddPaymentMethod(false);
                    setSetupIntentClientSecret(null);
                  }}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo para eliminar método de pago */}
        <Dialog
          open={!!paymentMethodToDelete}
          onOpenChange={(open) => !open && setPaymentMethodToDelete(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar método de pago</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar este método de pago? Esta
                acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPaymentMethodToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePaymentMethod}
                disabled={deletePaymentMethod.isPending}
              >
                {deletePaymentMethod.isPending
                  ? "Eliminando..."
                  : "Eliminar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

