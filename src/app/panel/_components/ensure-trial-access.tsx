import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { userAccess } from "~/server/db/schema";

export default async function EnsureTrialAccess() {
	try {
		// Obtener la sesión actual
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session?.user) {
			return null;
		}

		const userId = session.user.id;

		// Verificar si el usuario tiene una cuenta de Google
		const googleAccount = await db.query.account.findFirst({
			where: (account, { eq: eqFn, and: andFn }) =>
				andFn(eqFn(account.userId, userId), eqFn(account.providerId, "google")),
		});

		if (googleAccount) {
			// Verificar si ya tiene acceso configurado
			const existingAccess = await db.query.userAccess.findFirst({
				where: (userAccess, { eq: eqFn }) => eqFn(userAccess.userId, userId),
			});

			// Si no tiene acceso, crear el periodo de prueba de 7 días
			if (!existingAccess) {
				await db.insert(userAccess).values({
					id: randomUUID(),
					userId: userId,
					hasLifetimeAccess: false,
					trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				});
			}
		}

		return null;
	} catch (error) {
		console.error("Error al verificar/crear trial access:", error);
		return null;
	}
}
