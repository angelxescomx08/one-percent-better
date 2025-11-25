import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { userAccess, user as userTable } from "~/server/db/schema";

export const usersRouter = createTRPCRouter({
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("El correo electrónico no es válido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, email, password } = input;

      // 1. Crear usuario en BetterAuth
      try {
        await auth.api.signUpEmail({
          body: { name, email, password },
          headers: await headers(),
        });
      } catch (error) {
        console.error(error);
        throw new Error("Error al crear cuenta. El correo podría estar en uso.");
      }

      // 2. Obtener ID del usuario recién creado
      const newUser = await db.query.user.findFirst({
        where: eq(userTable.email, email),
      });

      if (!newUser) throw new Error("Error crítico: Usuario no encontrado.");

      // 3. Activar Trial de 7 días DIRECTAMENTE en la BD
      await db.insert(userAccess).values({
        id: randomUUID(),
        userId: newUser.id,
        hasLifetimeAccess: false,
        // Seteamos la fecha de fin para dentro de 7 días exactos
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { success: true, userId: newUser.id };
    }),

  signInWithGoogle: publicProcedure.mutation(async () => {
    const res = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/panel" },
    });

    console.log(res);

    if (!res.url) throw new Error("Error con Google Auth");

    // Obtener la sesión después del callback de Google
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      const userId = session.user.id;

      const googleAccount = await db.query.account.findFirst({
        where: (account, { eq, and }) =>
          and(eq(account.userId, userId), eq(account.providerId, "google")),
      });

      if (googleAccount) {
        const existingAccess = await db.query.userAccess.findFirst({
          where: (userAccess, { eq }) => eq(userAccess.userId, userId),
        });

        if (!existingAccess) {
          await db.insert(userAccess).values({
            id: randomUUID(),
            userId: userId,
            hasLifetimeAccess: false,
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    return { url: res.url };
  }),
});

