import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react"; // Necesitas importar el icono
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
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-slate-950 overflow-hidden">
        
        {/* Decoración de fondo (Manchas de luz) */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:bg-indigo-500/20" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:bg-violet-500/20" />
        
        <Card className="w-full max-w-md border-slate-200 shadow-xl dark:border-slate-800 z-10">
          <CardHeader className="space-y-4 pb-2">
            
            {/* LOGO CENTRADO */}
            <div className="flex justify-center mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30">
                <Zap className="h-7 w-7 fill-white text-white" />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <CardTitle className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
                Bienvenido a OnePercent
              </CardTitle>
              <CardDescription className="text-base text-slate-500 dark:text-slate-400">
                Ingresa tus credenciales para continuar mejorando.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form action={signInWithEmail} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Correo Electrónico
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    name="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                    type="email"
                    className="h-11 bg-slate-50 dark:bg-slate-900/50"
                  />
                </FieldContent>
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password" className="text-slate-700 dark:text-slate-300">
                    Contraseña
                  </FieldLabel>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <FieldContent>
                  <Input
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    className="h-11 bg-slate-50 dark:bg-slate-900/50"
                  />
                </FieldContent>
              </Field>
              
              <Button className="w-full h-11 text-base bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md shadow-indigo-500/20" type="submit">
                Iniciar Sesión
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="dark:bg-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  O continúa con
                </span>
              </div>
            </div>

            <form action={signInWithGoogle}>
              <Button 
                className="w-full h-11 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" 
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

          <CardFooter className="flex flex-col space-y-4 border-t bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-center text-slate-500 text-sm dark:text-slate-400">
              ¿No tienes una cuenta?{" "}
              <Link
                className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
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