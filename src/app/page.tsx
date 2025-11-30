import { Zap } from "lucide-react"; // Necesitas importar el icono
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { auth } from "~/server/better-auth";
import { HydrateClient } from "~/trpc/server";

async function signInWithEmail(formData: FormData) {
	"use server";

	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!email || !password) {
		throw new Error("Email y contraseña son requeridos");
	}

	await auth.api.signInEmail({
		body: { email, password },
		headers: await headers(),
	});

	redirect("/panel");
}

async function signInWithGoogle() {
	"use server";
	const res = await auth.api.signInSocial({
		body: {
			provider: "google",
			callbackURL: "/panel",
		},
	});
	if (!res.url) {
		throw new Error("No URL returned from signInSocial");
	}
	redirect(res.url);
}

export default async function Home() {
	return (
		<HydrateClient>
			{/* Fondo claro con decoración sutil */}
			<main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
				{/* Decoración de fondo (Manchas de luz) */}
				<div className="-left-4 absolute top-0 h-72 w-72 animate-blob rounded-full bg-indigo-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-indigo-500/20" />
				<div className="-right-4 animation-delay-2000 absolute top-0 h-72 w-72 animate-blob rounded-full bg-violet-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-violet-500/20" />

				<Card className="fade-in zoom-in-95 z-10 w-full max-w-md animate-in border border-slate-200/80 shadow-2xl transition-all duration-700 hover:shadow-indigo-500/10 dark:border-slate-800/80 dark:shadow-slate-900/50">
					<CardHeader className="space-y-4 pb-2">
						{/* LOGO CENTRADO */}
						<div className="fade-in slide-in-from-top-4 mb-2 flex animate-in justify-center delay-200 duration-500">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 shadow-indigo-500/30 shadow-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-indigo-500/50">
								<Zap className="h-7 w-7 fill-white text-white transition-transform duration-300 ease-in-out" />
							</div>
						</div>

						<div className="fade-in slide-in-from-bottom-2 animate-in space-y-2 text-center delay-300 duration-500">
							<CardTitle className="font-bold text-2xl text-slate-900 tracking-tight dark:text-white">
								Bienvenido a OnePercent
							</CardTitle>
							<CardDescription className="text-base text-slate-500 dark:text-slate-400">
								Ingresa tus credenciales para continuar mejorando.
							</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						<form action={signInWithEmail} className="space-y-4">
							<Field className="fade-in slide-in-from-bottom-4 animate-in delay-400 duration-500">
								<FieldLabel
									className="text-slate-700 dark:text-slate-300"
									htmlFor="email"
								>
									Correo Electrónico
								</FieldLabel>
								<FieldContent>
									<Input
										className="h-11 bg-slate-50 transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
										id="email"
										name="email"
										placeholder="tucorreo@ejemplo.com"
										required
										type="email"
									/>
								</FieldContent>
							</Field>
							<Field className="fade-in slide-in-from-bottom-4 animate-in delay-500 duration-500">
								<div className="flex items-center justify-between">
									<FieldLabel
										className="text-slate-700 dark:text-slate-300"
										htmlFor="password"
									>
										Contraseña
									</FieldLabel>
									<Link
										className="font-medium text-indigo-600 text-xs transition-all duration-300 ease-in-out hover:text-indigo-500 hover:underline dark:text-indigo-400"
										href="/forgot-password"
									>
										¿Olvidaste tu contraseña?
									</Link>
								</div>
								<FieldContent>
									<Input
										className="h-11 bg-slate-50 transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
										id="password"
										name="password"
										placeholder="••••••••"
										required
										type="password"
									/>
								</FieldContent>
							</Field>

							<Button
								className="fade-in slide-in-from-bottom-4 h-11 w-full animate-in bg-indigo-600 text-base shadow-indigo-500/20 shadow-md transition-all delay-600 duration-500 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-indigo-500 dark:hover:bg-indigo-600"
								type="submit"
							>
								Iniciar Sesión
							</Button>
						</form>

						<div className="fade-in relative animate-in delay-700 duration-500">
							<div className="absolute inset-0 flex items-center">
								<Separator className="dark:bg-slate-800" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
									O continúa con
								</span>
							</div>
						</div>

						<form
							action={signInWithGoogle}
							className="fade-in slide-in-from-bottom-4 animate-in delay-800 duration-500"
						>
							<Button
								className="h-11 w-full border border-slate-200 bg-white text-slate-700 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
								type="submit"
								variant="outline"
							>
								<div className="mr-2 flex h-5 w-5 items-center justify-center">
									<Image
										alt="Google"
										height={18}
										src="/imgs/Logo-google-icon-PNG.png"
										width={18}
									/>
								</div>
								Google
							</Button>
						</form>
					</CardContent>

					<CardFooter className="flex flex-col space-y-4 border-slate-200/80 border-t bg-slate-50/50 p-6 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/50">
						<div className="text-center text-slate-500 text-sm dark:text-slate-400">
							¿No tienes una cuenta?{" "}
							<Link
								className="font-medium text-indigo-600 underline-offset-4 transition-all duration-300 ease-in-out hover:text-indigo-500 hover:underline dark:text-indigo-400"
								href="/register"
							>
								Regístrate gratis
							</Link>
						</div>
					</CardFooter>
				</Card>
			</main>
		</HydrateClient>
	);
}
