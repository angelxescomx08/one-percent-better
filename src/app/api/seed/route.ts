import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { names, seedData } from "~/lib/data/seed";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";
import {
  activity,
  activityLog,
  category,
  unit,
  user,
  userActivity,
} from "~/server/db/schema";

// Estructura de datos para categorías, unidades y actividades


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

    // Ejecutar todo dentro de una transacción para garantizar atomicidad
    const result = await db.transaction(async (tx) => {
      // Verificar si ya existen categorías
      const existingCategories = await tx.select().from(category).limit(1);
      let wereCategoriesCreated = false;

      let existingActivities: Array<{
        activity: typeof activity.$inferSelect;
        unit: typeof unit.$inferSelect;
      }> = [];

      // Si no hay categorías, crear todas las categorías, unidades y actividades
      if (existingCategories.length === 0) {
        wereCategoriesCreated = true;
        const createdCategories: Map<string, string> = new Map(); // nombre -> id
        const createdUnits: Map<string, string> = new Map(); // "categoryId-unitName" -> id

        // Preparar arrays para inserts en lote
        const categoryInserts: (typeof category.$inferInsert)[] = [];
        const unitInserts: (typeof unit.$inferInsert)[] = [];
        const activityInserts: (typeof activity.$inferInsert)[] = [];

        // Preparar todos los datos primero
        for (const categoryData of seedData) {
          const categoryId = randomUUID();
          categoryInserts.push({
            id: categoryId,
            name: categoryData.category,
            createdAt: twoYearsAgo,
            updatedAt: twoYearsAgo,
          });
          createdCategories.set(categoryData.category, categoryId);

          // Preparar unidades para esta categoría
          for (const unitData of categoryData.units) {
            const unitId = randomUUID();
            unitInserts.push({
              id: unitId,
              categoryId,
              name: unitData.name,
              shortName: unitData.shortName,
              createdAt: twoYearsAgo,
              updatedAt: twoYearsAgo,
            });
            createdUnits.set(`${categoryId}-${unitData.name}`, unitId);
          }

          // Preparar actividades para esta categoría
          for (let i = 0; i < categoryData.activities.length; i++) {
            const activityData = categoryData.activities[i];
            if (!activityData) continue;

            const unitIndex = i % categoryData.units.length;
            const selectedUnit = categoryData.units[unitIndex];
            if (!selectedUnit) continue;

            const unitId = createdUnits.get(
              `${categoryId}-${selectedUnit.name}`,
            );

            if (!unitId) {
              console.error(
                `No se encontró la unidad ${selectedUnit.name} para la categoría ${categoryData.category}`,
              );
              continue;
            }

            activityInserts.push({
              id: randomUUID(),
              categoryId,
              unitId,
              name: activityData.name,
              description: activityData.description,
              createdAt: twoYearsAgo,
              updatedAt: twoYearsAgo,
            });
          }
        }

        // Insertar todas las categorías en lote
        if (categoryInserts.length > 0) {
          await tx.insert(category).values(categoryInserts);
        }

        // Insertar todas las unidades en lote
        if (unitInserts.length > 0) {
          await tx.insert(unit).values(unitInserts);
        }

        // Insertar todas las actividades en lote
        if (activityInserts.length > 0) {
          await tx.insert(activity).values(activityInserts);
        }

        // Obtener todas las actividades creadas con sus unidades
        const activityIds = activityInserts.map((a) => a.id);
        if (activityIds.length > 0) {
          const activitiesWithUnits = await tx
            .select({
              activity: activity,
              unit: unit,
            })
            .from(activity)
            .innerJoin(unit, eq(activity.unitId, unit.id))
            .where(inArray(activity.id, activityIds));

          existingActivities = activitiesWithUnits;
        }
      } else {
        // Si ya existen categorías, obtener todas las actividades existentes
        existingActivities = await tx
          .select({
            activity: activity,
            unit: unit,
          })
          .from(activity)
          .innerJoin(unit, eq(activity.unitId, unit.id));
      }

      if (existingActivities.length === 0) {
        throw new Error(
          "No se pudieron crear o encontrar actividades en la base de datos.",
        );
      }

      return { existingActivities, wereCategoriesCreated };
    });

    const { existingActivities, wereCategoriesCreated } = result;

    const createdUsers: string[] = [];
    const totalDays = Math.floor(
      (now.getTime() - twoYearsAgo.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Preparar arrays para inserts en lote
    const userActivityInserts: (typeof userActivity.$inferInsert)[] = [];
    const activityLogInserts: (typeof activityLog.$inferInsert)[] = [];
    const userUpdates: Array<{
      id: string;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    // Obtener headers para la API de better-auth
    const authHeaders = await headers();

    // Crear 100 usuarios
    for (let i = 0; i < 100; i++) {
      const userName = names[i % names.length] || `Usuario ${i + 1}`;
      const userEmail = `usuario${i + 1}@ejemplo.com`;
      const password = "123456789";

      let userId: string;

      try {
        // Crear usuario usando la API de better-auth
        const result = await auth.api.signUpEmail({
          body: {
            name: userName,
            email: userEmail,
            password: password,
          },
          headers: authHeaders,
        });

        // Obtener el ID del usuario creado
        // Better-auth devuelve el usuario en la respuesta
        if (result.user?.id) {
          userId = result.user.id;
        } else {
          // Si no viene en la respuesta, buscar el usuario por email
          const createdUser = await db
            .select()
            .from(user)
            .where(eq(user.email, userEmail))
            .limit(1);

          if (createdUser.length > 0 && createdUser[0]) {
            userId = createdUser[0].id;
          } else {
            throw new Error(
              `No se pudo obtener el ID del usuario ${userEmail}`,
            );
          }
        }

        // Preparar actualización del usuario para hacerla en lote
        userUpdates.push({
          id: userId,
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
              (userId.charCodeAt(0) +
                act.id.charCodeAt(0) +
                dayOffset +
                i * 17) %
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
      } catch (error) {
        console.error(`Error al crear usuario ${userEmail}:`, error);
      }
    }

    // Ejecutar todas las actualizaciones y inserts en una transacción
    // Solo si hay usuarios creados
    if (createdUsers.length > 0) {
      await db.transaction(async (tx) => {
        // Actualizar todos los usuarios en lote
        if (userUpdates.length > 0) {
          // Actualizar usuarios uno por uno (drizzle no soporta update en lote con diferentes valores)
          // Pero podemos hacerlo en paralelo dentro de la transacción
          await Promise.all(
            userUpdates.map((userUpdate) =>
              tx
                .update(user)
                .set({
                  emailVerified: userUpdate.emailVerified,
                  createdAt: userUpdate.createdAt,
                  updatedAt: userUpdate.updatedAt,
                })
                .where(eq(user.id, userUpdate.id)),
            ),
          );
        }

        // Insertar todas las relaciones usuario-actividad en lote
        if (userActivityInserts.length > 0) {
          // Dividir en lotes de 1000 para evitar problemas de memoria
          const batchSize = 1000;
          for (let i = 0; i < userActivityInserts.length; i += batchSize) {
            const batch = userActivityInserts.slice(i, i + batchSize);
            await tx.insert(userActivity).values(batch);
          }
        }

        // Insertar todos los logs de actividad en lote
        if (activityLogInserts.length > 0) {
          // Dividir en lotes de 1000 para evitar problemas de memoria
          const batchSize = 1000;
          for (let i = 0; i < activityLogInserts.length; i += batchSize) {
            const batch = activityLogInserts.slice(i, i + batchSize);
            await tx.insert(activityLog).values(batch);
          }
        }
      });
    }

    // Contar categorías, unidades y actividades creadas
    const categoriesCount = wereCategoriesCreated ? seedData.length : 0;
    const unitsCount = wereCategoriesCreated
      ? seedData.reduce((sum, cat) => sum + cat.units.length, 0)
      : 0;
    const activitiesCount = wereCategoriesCreated
      ? seedData.reduce((sum, cat) => sum + cat.activities.length, 0)
      : 0;

    return NextResponse.json({
      success: true,
      categoriesCreated: categoriesCount,
      unitsCreated: unitsCount,
      activitiesCreated: activitiesCount,
      usersCreated: createdUsers.length,
      totalDays,
      logsCreated: activityLogInserts.length,
      message: `Base de datos poblada con ${categoriesCount > 0 ? `${categoriesCount} categorías, ${unitsCount} unidades, ${activitiesCount} actividades, ` : ""}${createdUsers.length} usuarios y ${activityLogInserts.length} registros de progreso de ${totalDays} días`,
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
