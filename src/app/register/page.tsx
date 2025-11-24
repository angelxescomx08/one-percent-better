import { randomUUID } from "node:crypto";
// --- DB & STRIPE IMPORTS ---
import { eq } from "drizzle-orm";
import { CreditCard, LockKeyhole, ShieldCheck, Zap } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field, FieldContent, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { env } from "~/env";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { userAccess, user as userTable } from "~/server/db/schema";
import { HydrateClient } from "~/trpc/server";

// Inicializa Stripe (Mueve esto a src/lib/stripe.ts si puedes)
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
	apiVersion: "2025-11-17.clover",
});

async function signUpWithTrial(formData: FormData) {
	"use server";
	const name = formData.get("name") as string;
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!name || !email || !password) {
		throw new Error("Todos los campos son requeridos");
	}

	// 1. Crear usuario en BetterAuth
	try {
		await auth.api.signUpEmail({
			body: { name, email, password },
			headers: await headers(),
		});
	} catch (error) {
		// Si falla (ej. correo duplicado), lanzamos error para mostrarlo en UI
		// Nota: En un entorno real, usa useFormState para manejar errores visualmente
		console.error(error);
		throw new Error("Error al crear cuenta. El correo podría estar en uso.");
	}

	// 2. Obtener ID del usuario recién creado
	const newUser = await db.query.user.findFirst({
		where: eq(userTable.email, email),
	});

	if (!newUser) throw new Error("Error crítico: Usuario no encontrado.");

	// 3. Crear Sesión de Stripe con Trial
	// IMPORTANTE: Este ID debe ser de un precio RECURRENTE en Stripe Dashboard.
	// Tu webhook se encargará de cancelar la suscripción tras el primer cobro
	// para convertirlo en un pago único efectivo.
	const STRIPE_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID;

	const session = await stripe.checkout.sessions.create({
		mode: "subscription", // Necesario para que funcione el Trial
		customer_email: email,
		line_items: [
			{
				price: STRIPE_PRICE_ID,
				quantity: 1,
			},
		],
		subscription_data: {
			trial_period_days: 7, // <--- Aquí forzamos los 7 días gratis
			metadata: {
				userId: newUser.id,
				type: "lifetime_deal_trial", // Etiqueta para que tu Webhook sepa qué hacer
			},
		},
		// Configuración para guardar tarjeta obligatoriamente
		payment_method_collection: "always",

		success_url: `${process.env.NEXT_PUBLIC_APP_URL}/panel?success=trial_started`,
		cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?canceled=true`,
	});

	// 4. Crear registro de acceso pendiente en BD
	// El usuario tendrá acceso 'trialing' hasta que Stripe confirme el pago en 7 días
	await db.insert(userAccess).values({
		id: randomUUID(),
		userId: newUser.id,
		hasLifetimeAccess: false,
		trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		// stripeCustomerId se llenará vía Webhook
	});

	// 5. Redirigir a la pasarela de pago
	if (session.url) {
		redirect(session.url);
	}
}

async function signInWithGoogle() {
	"use server";
	const res = await auth.api.signInSocial({
		body: { provider: "google", callbackURL: "/panel" },
	});
	if (!res.url) throw new Error("Error con Google Auth");
	redirect(res.url);
}

export default async function RegisterPage() {
	return (
		<HydrateClient>
			<main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
				{/* Decoración de fondo */}
				<div className="-left-4 absolute top-0 h-96 w-96 animate-blob rounded-full bg-indigo-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-indigo-500/20" />
				<div className="-right-4 animation-delay-2000 absolute bottom-0 h-96 w-96 animate-blob rounded-full bg-violet-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-violet-500/20" />

				<Card className="fade-in zoom-in-95 z-10 w-full max-w-md animate-in border-slate-200 shadow-2xl duration-500 dark:border-slate-800">
					{/* HEADER LLAMATIVO */}
					<div className="relative overflow-hidden rounded-t-xl bg-linear-to-r from-indigo-600 to-violet-600 p-6 text-center text-white">
						<div className="-right-4 -top-4 absolute h-24 w-24 rounded-full bg-white/10 blur-xl" />
						<div className="-left-4 -bottom-4 absolute h-24 w-24 rounded-full bg-white/10 blur-xl" />

						<div className="relative z-10 flex flex-col items-center gap-2">
							<div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
								<LockKeyhole className="h-6 w-6 text-white" />
							</div>
							<h2 className="font-bold text-lg">
								Comienza tu Prueba de 7 Días
							</h2>
							<p className="max-w-[280px] font-medium text-indigo-100 text-xs">
								Te pediremos tu tarjeta para verificar tu identidad, pero
								<span className="ml-1 font-bold text-white uppercase">
									no se cobrará nada hoy.
								</span>
							</p>
						</div>
					</div>

					<CardHeader className="pt-6 pb-2">
						<div className="mb-2 flex justify-center">
							{/* Logo Pequeño de Marca */}
							<div className="flex items-center gap-2 font-bold text-slate-900 text-xl dark:text-white">
								<Zap className="h-6 w-6 fill-indigo-600 text-indigo-600" />
								OnePercent
							</div>
						</div>
						<CardTitle className="text-center font-bold text-xl">
							Crear Cuenta
						</CardTitle>
						<CardDescription className="text-center">
							Ingresa tus datos para configurar tu acceso
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						<form action={signUpWithTrial} className="space-y-4">
							<Field>
								<FieldLabel htmlFor="name">Nombre Completo</FieldLabel>
								<FieldContent>
									<Input
										className="h-11 bg-slate-50 dark:bg-slate-900/50"
										id="name"
										name="name"
										placeholder="Ej. Juan Pérez"
										required
									/>
								</FieldContent>
							</Field>

							<Field>
								<FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
								<FieldContent>
									<Input
										className="h-11 bg-slate-50 dark:bg-slate-900/50"
										id="email"
										name="email"
										placeholder="tucorreo@ejemplo.com"
										required
										type="email"
									/>
								</FieldContent>
							</Field>

							<Field>
								<FieldLabel htmlFor="password">Contraseña</FieldLabel>
								<FieldContent>
									<Input
										className="h-11 bg-slate-50 dark:bg-slate-900/50"
										id="password"
										name="password"
										placeholder="••••••••"
										required
										type="password"
									/>
								</FieldContent>
							</Field>

							{/* Botón Principal */}
							<Button
								className="h-12 w-full bg-slate-900 font-semibold text-base text-white shadow-xl transition-transform hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-slate-200"
								type="submit"
							>
								<CreditCard className="mr-2 h-4 w-4" />
								Ir a Pasarela Segura
							</Button>

							{/* Garantía Visual */}
							<div className="flex items-center justify-center gap-4 font-medium text-[10px] text-slate-500">
								<span className="flex items-center gap-1">
									<ShieldCheck className="h-3 w-3 text-emerald-500" /> Datos
									Encriptados
								</span>
								<span className="flex items-center gap-1">
									<Zap className="h-3 w-3 text-amber-500" /> Cancela cuando
									quieras
								</span>
							</div>
						</form>

						<div className="relative my-2">
							<div className="absolute inset-0 flex items-center">
								<Separator className="dark:bg-slate-800" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
									O
								</span>
							</div>
						</div>

						<form action={signInWithGoogle}>
							<Button
								className="h-11 w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
								type="submit"
								variant="outline"
							>
								<Image
									alt="Google"
									className="mr-2"
									height={18}
									src="/imgs/Logo-google-icon-PNG.png"
									width={18}
								/>
								Registrarse con Google
							</Button>
						</form>
					</CardContent>

					<CardFooter className="flex flex-col gap-2 border-t bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
						<p className="text-center text-slate-500 text-xs">
							Al continuar, aceptas que se iniciará un periodo de prueba de 7
							días. Si no cancelas antes, se realizará un cargo único por el
							acceso de por vida.
						</p>
						<div className="pt-2 text-center text-sm">
							¿Ya eres miembro?{" "}
							<Link
								className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
								href="/"
							>
								Inicia sesión
							</Link>
						</div>
					</CardFooter>
				</Card>
			</main>
		</HydrateClient>
	);
}
