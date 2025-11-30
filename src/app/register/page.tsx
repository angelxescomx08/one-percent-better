"use client";

import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { api } from "~/trpc/react";
import { signInWithGoogleAction } from "./actions";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	const signUp = api.users.signUp.useMutation({
		onSuccess: () => {
			router.push("/panel");
		},
		onError: (error) => {
			setError(error.message || "Error al crear cuenta");
		},
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		await signUp.mutateAsync({ name, email, password });
	};

	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
			{/* Decoración de fondo */}
			<div className="-left-4 absolute top-0 h-96 w-96 animate-blob rounded-full bg-indigo-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-indigo-500/20" />
			<div className="-right-4 animation-delay-2000 absolute bottom-0 h-96 w-96 animate-blob rounded-full bg-violet-500/10 opacity-70 mix-blend-multiply blur-3xl filter dark:bg-violet-500/20" />

			<Card className="fade-in zoom-in-95 z-10 w-full max-w-md animate-in border border-slate-200/80 shadow-2xl transition-all duration-500 ease-in-out hover:shadow-indigo-500/10 dark:border-slate-800/80 dark:shadow-slate-900/50">
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
						Ingresa tus datos para comenzar
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{error && (
						<div className="fade-in slide-in-from-top-2 animate-in rounded-md border border-red-200/80 bg-red-50/90 p-3 text-red-800 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 ease-in-out dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
							{error}
						</div>
					)}

					<form className="space-y-4" onSubmit={handleSubmit}>
						<Field>
							<FieldLabel htmlFor="name">Nombre Completo</FieldLabel>
							<FieldContent>
								<Input
									className="h-11 bg-slate-50 transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
									id="name"
									name="name"
									onChange={(e) => setName(e.target.value)}
									placeholder="Ej. Juan Pérez"
									required
									value={name}
								/>
							</FieldContent>
						</Field>

						<Field>
							<FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
							<FieldContent>
								<Input
									className="h-11 bg-slate-50 transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
									id="email"
									name="email"
									onChange={(e) => setEmail(e.target.value)}
									placeholder="tucorreo@ejemplo.com"
									required
									type="email"
									value={email}
								/>
							</FieldContent>
						</Field>

						<Field>
							<FieldLabel htmlFor="password">Contraseña</FieldLabel>
							<FieldContent>
								<Input
									className="h-11 bg-slate-50 transition-all duration-300 ease-in-out hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-900/50 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 dark:hover:border-slate-700"
									id="password"
									name="password"
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									required
									type="password"
									value={password}
								/>
							</FieldContent>
						</Field>

						{/* Botón Principal MODIFICADO */}
						<Button
							className="h-12 w-full bg-slate-900 font-semibold text-base text-white shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-slate-800 hover:shadow-2xl hover:shadow-slate-900/30 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-slate-200"
							disabled={signUp.isPending}
							type="submit"
						>
							{signUp.isPending ? "Creando cuenta..." : "Empezar Prueba Gratis"}
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>

						{/* Garantía Visual */}
						<div className="flex items-center justify-center gap-4 font-medium text-[10px] text-slate-500">
							<span className="flex items-center gap-1">
								<ShieldCheck className="h-3 w-3 text-emerald-500" /> Datos
								Privados
							</span>
							<span className="flex items-center gap-1">
								<Zap className="h-3 w-3 text-amber-500" /> Acceso Inmediato
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

					<form action={signInWithGoogleAction}>
						<Button
							className="h-11 w-full border border-slate-200 bg-white text-slate-700 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
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

				<CardFooter className="flex flex-col gap-2 border-slate-200/80 border-t bg-slate-50/50 p-6 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/50">
					<p className="text-center text-slate-500 text-xs">
						Al continuar, aceptas nuestros términos de servicio. Tu prueba de 7
						días comienza al instante.
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
	);
}
