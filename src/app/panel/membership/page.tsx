"use client";

import {
	Elements,
	PaymentElement,
	useElements,
	useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	CreditCard,
	Crown,
	Edit,
	Plus,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import ModalDrawer from "~/app/_components/shared/modalDrawer";
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
import { env } from "~/env";
import { api } from "~/trpc/react";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Componente para agregar nuevo método de pago
function AddPaymentMethodForm({
	clientSecret,
	onSuccess,
	onCancel,
	setupIntentId,
}: {
	clientSecret: string;
	onSuccess: () => void;
	onCancel: () => void;
	setupIntentId?: string;
}) {
	const stripe = useStripe();
	const elements = useElements();
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const setPaymentMethodFromSetupIntent =
		api.stripe.setPaymentMethodFromSetupIntent.useMutation();

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
			// Primero validar y preparar los elementos
			const { error: submitError } = await elements.submit();

			if (submitError) {
				setError(
					submitError.message ?? "Error al validar los datos de la tarjeta",
				);
				setIsProcessing(false);
				return;
			}

			// Luego confirmar el setup intent
			const { error: confirmError, setupIntent } = await stripe.confirmSetup({
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
				// Establecer como método de pago por defecto
				const intentId =
					setupIntent?.id ?? setupIntentId ?? clientSecret.split("_secret")[0];
				if (intentId) {
					try {
						await setPaymentMethodFromSetupIntent.mutateAsync({
							setupIntentId: intentId,
						});
					} catch (err) {
						console.error("Error al establecer método por defecto:", err);
						// No fallar si no se puede establecer como por defecto
					}
				}
				onSuccess();
			}
		} catch (err) {
			console.error("Error al agregar método de pago:", err);
			setError("Error inesperado al procesar el pago");
			setIsProcessing(false);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			{error && (
				<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
					{error}
				</div>
			)}
			<div className="rounded-md border p-4">
				<PaymentElement />
			</div>
			<DialogFooter>
				<Button onClick={onCancel} type="button" variant="outline">
					Cancelar
				</Button>
				<Button disabled={isProcessing || !stripe || !elements} type="submit">
					{isProcessing ? "Procesando..." : "Agregar"}
				</Button>
			</DialogFooter>
		</form>
	);
}

// Componente para mostrar opciones de compra
function PricingSection({
	membership,
}: {
	membership: {
		type: "trial" | "subscription" | "lifetime";
		hasLifetimeAccess: boolean;
		trialEndsAt: Date | null;
		subscription: {
			id: string;
			status: string;
			currentPeriodEnd: number;
			currentPeriodStart: number;
			cancelAtPeriodEnd: boolean;
			price: {
				id: string | undefined;
				amount: number | null | undefined;
				currency: string | undefined;
				interval: string | undefined;
				intervalCount: number | undefined;
			};
			product: {
				id: string | undefined;
				name: string | null | undefined;
				description: string | null | undefined;
			};
		} | null;
	};
}) {
	const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
	const [showCheckout, setShowCheckout] = useState(false);
	const [checkoutType, setCheckoutType] = useState<"lifetime" | "subscription">(
		"lifetime",
	);

	const { data: prices, isLoading: isLoadingPrices } =
		api.stripe.getProductPrices.useQuery();

	const utils = api.useUtils();
	const createLifetimePaymentIntent =
		api.stripe.createLifetimePaymentIntent.useMutation();
	const createSubscription = api.stripe.createSubscription.useMutation();

	const handlePurchase = async (priceId: string, type: "lifetime" | "subscription") => {
		setSelectedPriceId(priceId);
		setCheckoutType(type);
		setShowCheckout(true);
	};

	const handleCheckoutSuccess = () => {
		setShowCheckout(false);
		setSelectedPriceId(null);
		void utils.stripe.getMembership.invalidate();
	};

	if (isLoadingPrices) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Opciones de Compra</CardTitle>
					<CardDescription>
						Carga las opciones de precio disponibles
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!prices) {
		return null;
	}

	const formatPrice = (amount: number, currency: string = "usd") => {
		return new Intl.NumberFormat("es-ES", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Opciones de Compra</CardTitle>
					<CardDescription>
						Elige el plan que mejor se adapte a tus necesidades
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						{/* Precio mensual */}
						{prices.monthly.length > 0 && (
							<Card className="border-2">
								<CardHeader>
									<CardTitle className="text-lg">Suscripción Mensual</CardTitle>
									<CardDescription>
										Renovación automática cada mes
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<p className="font-bold text-3xl">
											{formatPrice(
												prices.monthly[0]?.amount ?? 0,
												prices.monthly[0]?.currency,
											)}
										</p>
										<p className="text-slate-500 text-sm dark:text-slate-400">
											/mes
										</p>
									</div>
									<Button
										className="w-full"
										onClick={() =>
											handlePurchase(
												prices.monthly[0]?.id ?? "",
												"subscription",
											)
										}
										variant="outline"
									>
										Suscribirse
									</Button>
								</CardContent>
							</Card>
						)}

						{/* Precio de por vida */}
						{prices.lifetime.length > 0 && (
							<Card className="relative border-2">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">Acceso de por vida</CardTitle>
										<Crown className="h-5 w-5 text-amber-500" />
									</div>
									<CardDescription>
										Pago único, acceso permanente
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<p className="font-bold text-3xl">
											{formatPrice(
												prices.lifetime[0]?.amount ?? 0,
												prices.lifetime[0]?.currency,
											)}
										</p>
										<p className="text-slate-500 text-sm dark:text-slate-400">
											Pago único
										</p>
									</div>
									<Button
										className="w-full"
										onClick={() =>
											handlePurchase(prices.lifetime[0]?.id ?? "", "lifetime")
										}
										variant="outline"
									>
										<Sparkles className="mr-2 h-4 w-4" />
										Comprar ahora
									</Button>
								</CardContent>
							</Card>
						)}

						{/* Precio anual */}
						{prices.yearly.length > 0 && (
							<Card className="border-2 border-primary">
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">Suscripción Anual</CardTitle>
										<Badge variant="secondary">Mejor valor</Badge>
									</div>
									<CardDescription>
										Renovación automática cada año
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<p className="font-bold text-3xl">
											{formatPrice(
												prices.yearly[0]?.amount ?? 0,
												prices.yearly[0]?.currency,
											)}
										</p>
										<p className="text-slate-500 text-sm dark:text-slate-400">
											/año
										</p>
									</div>
									<Button
										className="w-full"
										onClick={() =>
											handlePurchase(
												prices.yearly[0]?.id ?? "",
												"subscription",
											)
										}
									>
										Suscribirse
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Modal de checkout */}
			{showCheckout && selectedPriceId && (
				<CheckoutModal
					priceId={selectedPriceId}
					type={checkoutType}
					onSuccess={handleCheckoutSuccess}
					onCancel={() => {
						setShowCheckout(false);
						setSelectedPriceId(null);
					}}
				/>
			)}
		</>
	);
}

// Componente de checkout
function CheckoutModal({
	priceId,
	type,
	onSuccess,
	onCancel,
}: {
	priceId: string;
	type: "lifetime" | "subscription";
	onSuccess: () => void;
	onCancel: () => void;
}) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);

	const { data: paymentMethods } = api.stripe.getPaymentMethods.useQuery();
	const createLifetimePaymentIntent =
		api.stripe.createLifetimePaymentIntent.useMutation();
	const createSubscription = api.stripe.createSubscription.useMutation();

	// Inicializar el checkout
	useEffect(() => {
		const initializeCheckout = async () => {
			setIsInitializing(true);
			setError(null);
			try {
				if (type === "lifetime") {
					const result = await createLifetimePaymentIntent.mutateAsync({
						priceId,
					});
					setClientSecret(result.clientSecret);
				} else {
					// Para suscripciones, intentar usar método de pago por defecto
					if (paymentMethods?.defaultPaymentMethod) {
						const defaultPaymentMethodId =
							typeof paymentMethods.defaultPaymentMethod === "string"
								? paymentMethods.defaultPaymentMethod
								: null;
						if (!defaultPaymentMethodId) {
							setError("No se pudo obtener el método de pago por defecto");
							setIsInitializing(false);
							return;
						}
						const result = await createSubscription.mutateAsync({
							priceId,
							paymentMethodId: defaultPaymentMethodId,
						});
						if (result.clientSecret) {
							setClientSecret(result.clientSecret);
						} else {
							// La suscripción se creó exitosamente sin necesidad de pago inmediato
							onSuccess();
							return;
						}
					} else {
						// Si no hay método por defecto, crear suscripción y pedir método de pago
						const result = await createSubscription.mutateAsync({
							priceId,
						});
						if (result.clientSecret) {
							setClientSecret(result.clientSecret);
						} else {
							onSuccess();
							return;
						}
					}
				}
			} catch (err) {
				console.error("Error al inicializar checkout:", err);
				setError(
					err instanceof Error ? err.message : "Error al inicializar el proceso de pago",
				);
			} finally {
				setIsInitializing(false);
			}
		};

		void initializeCheckout();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [priceId, type]);

	if (isInitializing) {
		return (
			<ModalDrawer
				description="Inicializando proceso de pago..."
				isOpen={true}
				setIsOpen={() => {}}
				title="Procesando..."
			>
				<div className="flex items-center justify-center p-8">
					<Skeleton className="h-8 w-8" />
				</div>
			</ModalDrawer>
		);
	}

	if (error && !clientSecret) {
		return (
			<ModalDrawer
				description={error}
				isOpen={true}
				setIsOpen={onCancel}
				title="Error"
			>
				<DialogFooter>
					<Button onClick={onCancel} variant="outline">
						Cerrar
					</Button>
				</DialogFooter>
			</ModalDrawer>
		);
	}

	if (!clientSecret) {
		return null;
	}

	return (
		<ModalDrawer
			description={
				type === "lifetime"
					? "Completa el pago para obtener acceso de por vida"
					: "Completa el pago para activar tu suscripción"
			}
			isOpen={true}
			setIsOpen={onCancel}
			title={type === "lifetime" ? "Comprar acceso de por vida" : "Activar suscripción"}
		>
			<Elements
				options={{
					clientSecret,
					appearance: {
						theme: "stripe",
					},
				}}
				stripe={stripePromise}
			>
				<CheckoutForm
					clientSecret={clientSecret}
					type={type}
					onSuccess={onSuccess}
					onCancel={onCancel}
				/>
			</Elements>
		</ModalDrawer>
	);
}

// Formulario de checkout
function CheckoutForm({
	clientSecret,
	type,
	onSuccess,
	onCancel,
}: {
	clientSecret: string;
	type: "lifetime" | "subscription";
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
			// Primero validar y preparar los elementos
			const { error: submitError } = await elements.submit();

			if (submitError) {
				setError(
					submitError.message ?? "Error al validar los datos de la tarjeta",
				);
				setIsProcessing(false);
				return;
			}

			// Confirmar el pago
			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				clientSecret,
				confirmParams: {
					return_url: window.location.href,
				},
				redirect: "if_required",
			});

			if (confirmError) {
				setError(confirmError.message ?? "Error al procesar el pago");
				setIsProcessing(false);
			} else {
				onSuccess();
			}
		} catch (err) {
			console.error("Error al procesar pago:", err);
			setError("Error inesperado al procesar el pago");
			setIsProcessing(false);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			{error && (
				<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
					{error}
				</div>
			)}
			<div className="rounded-md border p-4">
				<PaymentElement />
			</div>
			<DialogFooter>
				<Button onClick={onCancel} type="button" variant="outline">
					Cancelar
				</Button>
				<Button disabled={isProcessing || !stripe || !elements} type="submit">
					{isProcessing
						? "Procesando..."
						: type === "lifetime"
							? "Comprar ahora"
							: "Activar suscripción"}
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
	const setDefaultPaymentMethod =
		api.stripe.setDefaultPaymentMethod.useMutation({
			onSuccess: () => {
				void utils.stripe.getPaymentMethods.invalidate();
			},
		});
	const deletePaymentMethod = api.stripe.deletePaymentMethod.useMutation({
		onSuccess: () => {
			void utils.stripe.getPaymentMethods.invalidate();
			setPaymentMethodToDelete(null);
		},
	});
	const cancelSubscription = api.stripe.cancelSubscription.useMutation({
		onSuccess: () => {
			void utils.stripe.getMembership.invalidate();
		},
	});
	const reactivateSubscription = api.stripe.reactivateSubscription.useMutation({
		onSuccess: () => {
			void utils.stripe.getMembership.invalidate();
		},
	});

	const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<
		string | null
	>(null);
	const [setupIntentId, setSetupIntentId] = useState<string | undefined>(
		undefined,
	);

	const handleAddPaymentMethod = async () => {
		try {
			const result = await createSetupIntent.mutateAsync();
			if (result.clientSecret) {
				setSetupIntentClientSecret(result.clientSecret);
				// Extraer el ID del setup intent del client secret
				const intentId = result.clientSecret.split("_secret")[0];
				setSetupIntentId(intentId);
				setShowAddPaymentMethod(true);
			}
		} catch (error) {
			console.error("Error al crear setup intent:", error);
		}
	};

	const handlePaymentMethodAdded = () => {
		setShowAddPaymentMethod(false);
		setSetupIntentClientSecret(null);
		setSetupIntentId(undefined);
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
		<div className="min-h-screen w-full bg-slate-50/50 p-4 md:p-8 dark:bg-black">
			<div className="mx-auto max-w-4xl space-y-6">
				{/* Header */}
				<div>
					<h1 className="font-bold text-3xl text-slate-900 tracking-tight dark:text-slate-50">
						Mi Membresía
					</h1>
					<p className="text-slate-500 text-sm dark:text-slate-400">
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
										<p className="text-slate-500 text-sm dark:text-slate-400">
											No necesitas realizar ningún pago adicional. Disfruta de
											todas las funcionalidades sin límites.
										</p>
									</div>
								)}

								{membership.type === "subscription" &&
									membership.subscription && (
										<div className="space-y-4">
											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<p className="font-medium text-slate-500 text-sm dark:text-slate-400">
														Plan
													</p>
													<p className="font-semibold text-lg">
														{membership.subscription.product?.name ??
															"Suscripción"}
													</p>
													{membership.subscription.product?.description && (
														<p className="text-slate-500 text-sm dark:text-slate-400">
															{membership.subscription.product.description}
														</p>
													)}
												</div>
												<div>
													<p className="font-medium text-slate-500 text-sm dark:text-slate-400">
														Precio
													</p>
													<p className="font-semibold text-lg">
														{membership.subscription.price?.amount
															? `$${(
																	membership.subscription.price.amount / 100
																).toFixed(2)}`
															: "N/A"}{" "}
														{membership.subscription.price?.interval === "month"
															? "/mes"
															: membership.subscription.price?.interval ===
																	"year"
																? "/año"
																: ""}
													</p>
												</div>
											</div>

											<Separator />

											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<p className="font-medium text-slate-500 text-sm dark:text-slate-400">
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
																		membership.subscription.currentPeriodEnd *
																			1000,
																	),
																	"d 'de' MMMM, yyyy",
																	{ locale: es },
																)
															: "N/A"}
													</p>
												</div>
												<div>
													<p className="font-medium text-slate-500 text-sm dark:text-slate-400">
														Próximo pago
													</p>
													<p className="text-sm">
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
													</p>
												</div>
											</div>

											{membership.subscription.cancelAtPeriodEnd && (
												<div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
													<div className="flex items-start gap-2">
														<AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
														<div className="flex-1">
															<p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
																Suscripción cancelada
															</p>
															<p className="text-xs text-yellow-700 dark:text-yellow-300">
																Tu suscripción se cancelará al final del periodo
																actual. Seguirás teniendo acceso hasta{" "}
																{membership.subscription.currentPeriodEnd
																	? format(
																			new Date(
																				membership.subscription
																					.currentPeriodEnd * 1000,
																			),
																			"d 'de' MMMM, yyyy",
																			{ locale: es },
																		)
																	: "N/A"}
																.
															</p>
														</div>
														<Button
															disabled={reactivateSubscription.isPending}
															onClick={() => {
																void reactivateSubscription.mutateAsync();
															}}
															size="sm"
															variant="outline"
														>
															Reactivar
														</Button>
													</div>
												</div>
											)}

											{membership.subscription.status === "active" &&
												!membership.subscription.cancelAtPeriodEnd && (
													<div className="flex justify-end">
														<Button
															disabled={cancelSubscription.isPending}
															onClick={() => {
																if (
																	confirm(
																		"¿Estás seguro de que deseas cancelar tu suscripción? Podrás seguir usando el servicio hasta el final del periodo actual.",
																	)
																) {
																	void cancelSubscription.mutateAsync();
																}
															}}
															variant="destructive"
														>
															{cancelSubscription.isPending
																? "Cancelando..."
																: "Cancelar Suscripción"}
														</Button>
													</div>
												)}
										</div>
									)}

								{membership.type === "trial" && (
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<Calendar className="h-5 w-5 text-blue-500" />
											<span className="font-medium">
												Periodo de prueba activo
											</span>
										</div>
										<p className="text-slate-500 text-sm dark:text-slate-400">
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

				{/* Sección de Compra - Solo mostrar si no tiene acceso de por vida */}
				{membership && membership.type !== "lifetime" && (
					<PricingSection membership={membership} />
				)}

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
								disabled={createSetupIntent.isPending}
								onClick={handleAddPaymentMethod}
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
							<div className="py-8 text-center text-slate-500 dark:text-slate-400">
								<CreditCard className="mx-auto mb-3 h-12 w-12 opacity-50" />
								<p>No tienes métodos de pago guardados</p>
								<p className="mt-1 text-sm">Agrega una tarjeta para comenzar</p>
							</div>
						) : (
							<div className="space-y-3">
								{paymentMethods?.paymentMethods.map((pm) => (
									<div
										className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
										key={pm.id}
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
														<Badge className="text-xs" variant="secondary">
															Por defecto
														</Badge>
													)}
												</div>
												{pm.card && (
													<p className="text-slate-500 text-sm dark:text-slate-400">
														Expira {pm.card.expMonth}/{pm.card.expYear}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											{!pm.isDefault && (
												<Button
													disabled={setDefaultPaymentMethod.isPending}
													onClick={() => handleSetDefault(pm.id)}
													size="sm"
													variant="outline"
												>
													<Edit className="mr-1 h-3 w-3" />
													Usar por defecto
												</Button>
											)}
											<Button
												disabled={deletePaymentMethod.isPending}
												onClick={() => setPaymentMethodToDelete(pm.id)}
												size="sm"
												variant="outline"
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
				<ModalDrawer
					description="Ingresa los datos de tu tarjeta para agregarla como método de pago"
					isOpen={showAddPaymentMethod}
					setIsOpen={(open) => {
						const isOpenValue =
							typeof open === "function" ? open(showAddPaymentMethod) : open;
						setShowAddPaymentMethod(isOpenValue);
						if (!isOpenValue) {
							setSetupIntentClientSecret(null);
						}
					}}
					title="Agregar método de pago"
				>
					{setupIntentClientSecret && (
						<Elements
							options={{
								clientSecret: setupIntentClientSecret,
								appearance: {
									theme: "stripe",
								},
							}}
							stripe={stripePromise}
						>
							<AddPaymentMethodForm
								clientSecret={setupIntentClientSecret}
								setupIntentId={setupIntentId}
								onCancel={() => {
									setShowAddPaymentMethod(false);
									setSetupIntentClientSecret(null);
									setSetupIntentId(undefined);
								}}
								onSuccess={handlePaymentMethodAdded}
							/>
						</Elements>
					)}
				</ModalDrawer>

				{/* Diálogo para eliminar método de pago */}
				<Dialog
					onOpenChange={(open) => !open && setPaymentMethodToDelete(null)}
					open={!!paymentMethodToDelete}
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
								onClick={() => setPaymentMethodToDelete(null)}
								variant="outline"
							>
								Cancelar
							</Button>
							<Button
								disabled={deletePaymentMethod.isPending}
								onClick={handleDeletePaymentMethod}
								variant="destructive"
							>
								{deletePaymentMethod.isPending ? "Eliminando..." : "Eliminar"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
