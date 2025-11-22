import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "~/server/db";
import {
  activity,
  activityLog,
  unit,
  user,
  userActivity,
} from "~/server/db/schema";

export async function GET() {
  try {
    // Solo permitir en desarrollo o con una clave secreta
    if (process.env.NODE_ENV === "production") {
      // En producción, podrías requerir una clave secreta
      // const authHeader = request.headers.get("authorization");
      // if (authHeader !== `Bearer ${process.env.POPULATE_SECRET_KEY}`) {
      //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // }
      return NextResponse.json(
        { error: "Este endpoint solo está disponible en desarrollo" },
        { status: 403 },
      );
    }

    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    twoYearsAgo.setHours(0, 0, 0, 0);

    // Obtener todas las actividades existentes con sus unidades
    const existingActivities = await db
      .select({
        activity: activity,
        unit: unit,
      })
      .from(activity)
      .innerJoin(unit, eq(activity.unitId, unit.id));

    if (existingActivities.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hay actividades en la base de datos. Por favor, crea al menos una actividad primero.",
        },
        { status: 400 },
      );
    }

    const createdUsers: string[] = [];
    const totalDays = Math.floor(
      (now.getTime() - twoYearsAgo.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Preparar arrays para inserts en lote
    const userInserts: (typeof user.$inferInsert)[] = [];
    const userActivityInserts: (typeof userActivity.$inferInsert)[] = [];
    const activityLogInserts: (typeof activityLog.$inferInsert)[] = [];

    // Crear 100 usuarios
    for (let i = 0; i < 100; i++) {
      const userId = randomUUID();
      const userName = `Usuario ${i + 1}`;
      const userEmail = `usuario${i + 1}@ejemplo.com`;

      // Preparar usuario para insert en lote
      userInserts.push({
        id: userId,
        name: userName,
        email: userEmail,
        emailVerified: true,
        createdAt: twoYearsAgo,
        updatedAt: twoYearsAgo,
      });

      createdUsers.push(userId);

      // Asignar actividades al usuario (1-3 actividades determinísticamente)
      const numActivities = (i % 3) + 1; // 1, 2, o 3 actividades
      const selectedActivities = existingActivities.slice(0, numActivities);

      for (const { activity: act, unit: unitData } of selectedActivities) {
        // Preparar userActivity para insert en lote
        userActivityInserts.push({
          id: randomUUID(),
          userId,
          activityId: act.id,
          createdAt: twoYearsAgo,
        });

        // Generar logs de actividad para los últimos 2 años
        // Patrón determinístico: usar el ID del usuario y el día para decidir si hay actividad
        for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
          const logDate = new Date(twoYearsAgo);
          logDate.setDate(logDate.getDate() + dayOffset);
          logDate.setHours(
            Math.floor((i % 24) * 0.5 + 8), // Hora determinística entre 8-20
            (i * 7) % 60, // Minutos determinísticos
            0,
            0,
          );

          // Decidir si este día tiene actividad de forma determinística
          // Usar una función hash simple basada en userId, activityId y dayOffset
          const hash =
            (userId.charCodeAt(0) + act.id.charCodeAt(0) + dayOffset + i * 17) %
            100;

          // Algunos usuarios son más consistentes que otros
          // Usuario i tiene actividad si hash < (70 - (i % 30))
          // Esto crea un rango de 40-70% de días con actividad
          const activityThreshold = 70 - (i % 30);

          if (hash < activityThreshold) {
            // Generar un valor determinístico basado en el día y usuario
            const baseValue = 10 + ((i * 13 + dayOffset * 7) % 100);
            const improvementFactor = 1 + dayOffset / 1000; // Mejora gradual
            const value = (baseValue * improvementFactor).toFixed(2);

            // Preparar activityLog para insert en lote
            activityLogInserts.push({
              id: randomUUID(),
              activityId: act.id,
              userId,
              unitId: unitData.id,
              date: logDate,
              value,
              note: null,
              createdAt: logDate,
              updatedAt: logDate,
            });
          }
        }
      }
    }

    // Insertar todos los usuarios en lote
    if (userInserts.length > 0) {
      await db.insert(user).values(userInserts);
    }

    // Insertar todas las relaciones usuario-actividad en lote
    if (userActivityInserts.length > 0) {
      // Dividir en lotes de 1000 para evitar problemas de memoria
      const batchSize = 1000;
      for (let i = 0; i < userActivityInserts.length; i += batchSize) {
        const batch = userActivityInserts.slice(i, i + batchSize);
        await db.insert(userActivity).values(batch);
      }
    }

    // Insertar todos los logs de actividad en lote
    if (activityLogInserts.length > 0) {
      // Dividir en lotes de 1000 para evitar problemas de memoria
      const batchSize = 1000;
      for (let i = 0; i < activityLogInserts.length; i += batchSize) {
        const batch = activityLogInserts.slice(i, i + batchSize);
        await db.insert(activityLog).values(batch);
      }
    }

    return NextResponse.json({
      success: true,
      usersCreated: createdUsers.length,
      totalDays,
      logsCreated: activityLogInserts.length,
      message: `Base de datos poblada con ${createdUsers.length} usuarios y ${activityLogInserts.length} registros de progreso de ${totalDays} días`,
    });
  } catch (error) {
    console.error("Error al poblar la base de datos:", error);
    return NextResponse.json(
      {
        error: "Error al poblar la base de datos",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
