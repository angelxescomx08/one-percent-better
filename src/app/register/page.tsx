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

async function signUpWithEmail(formData: FormData) {
	"use server";
	const name = formData.get("name") as string;
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!name || !email || !password) {
		throw new Error("Nombre, email y contraseña son requeridos");
	}

	try {
		await auth.api.signUpEmail({
			body: {
				name,
				email,
				password,
			},
			headers: await headers(),
		});
		redirect("/panel");
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : "Error al crear la cuenta",
		);
	}
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

export default async function RegisterPage() {
	return (
		<HydrateClient>
			<main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#2e026d] to-[#15162c] p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="space-y-1">
						<CardTitle className="text-center font-bold text-2xl">
							Crear Cuenta
						</CardTitle>
						<CardDescription className="text-center">
							Regístrate con tu correo y contraseña o con Google
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<form action={signUpWithEmail} className="space-y-4">
							<Field>
								<FieldLabel htmlFor="name">Nombre</FieldLabel>
								<FieldContent>
									<Input
										id="name"
										name="name"
										placeholder="Tu nombre"
										required
										type="text"
									/>
								</FieldContent>
							</Field>
							<Field>
								<FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
								<FieldContent>
									<Input
										id="email"
										name="email"
										placeholder="correo@ejemplo.com"
										required
										type="email"
									/>
								</FieldContent>
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Contraseña</FieldLabel>
								<FieldContent>
									<Input
										id="password"
										name="password"
										placeholder="••••••••"
										required
										type="password"
									/>
								</FieldContent>
							</Field>
							<Button className="w-full" type="submit">
								Crear Cuenta
							</Button>
						</form>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<Separator />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-2 text-muted-foreground">
									O continúa con
								</span>
							</div>
						</div>

						<form action={signInWithGoogle}>
							<Button className="w-full" type="submit" variant="outline">
								<Image
									alt="Google"
									height={20}
									src="/imgs/Logo-google-icon-PNG.png"
									width={20}
								/>
								Continuar con Google
							</Button>
						</form>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4">
						<div className="text-center text-muted-foreground text-sm">
							¿Ya tienes una cuenta?{" "}
							<Link
								className="text-primary underline-offset-4 hover:underline"
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
