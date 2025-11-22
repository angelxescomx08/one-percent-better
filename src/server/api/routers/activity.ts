import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { activity, activityLog, category, unit, userActivity } from "~/server/db/schema";

export const activityRouter = createTRPCRouter({
  getActivities: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const activities = await db
      .select()
      .from(userActivity)
      .innerJoin(activity, eq(userActivity.activityId, activity.id))
      .where(eq(userActivity.userId, session.user.id));

    return activities.map(activity => activity.activity);
  }),

  getActivityById: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;
      const result = await db
        .select()
        .from(userActivity)
        .innerJoin(activity, eq(userActivity.activityId, activity.id))
        .innerJoin(unit, eq(activity.unitId, unit.id))
        .where(
          and(
            eq(userActivity.userId, session.user.id),
            eq(activity.id, input.activityId)
          )
        )
        .limit(1);

      if (!result[0]) {
        throw new Error("Activity not found");
      }

      return {
        activity: result[0].activity,
        unit: result[0].unit,
      };
    }),

  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    return await db.select().from(category).orderBy(category.name);
  }),

  getUnitsByCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      return await db
        .select()
        .from(unit)
        .where(eq(unit.categoryId, input.categoryId))
        .orderBy(unit.name);
    }),

  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().min(1, "La categoría es requerida"),
        unitId: z.string().min(1, "La unidad es requerida"),
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const newActivity = await db
        .insert(activity)
        .values({
          id: randomUUID(),
          categoryId: input.categoryId,
          unitId: input.unitId,
          name: input.name,
          description: input.description ?? null,
        })
        .returning();

      if (!newActivity[0]) {
        throw new Error("Failed to create activity");
      }

      // Create user activity
      await db.insert(userActivity).values({
        id: randomUUID(),
        userId: ctx.session.user.id,
        activityId: newActivity[0].id,
      });

      return newActivity[0];
    }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const newCategory = await db
        .insert(category)
        .values({
          id: randomUUID(),
          name: input.name,
        })
        .returning();

      return newCategory[0];
    }),

  createUnit: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().min(1, "La categoría es requerida"),
        name: z.string().min(1, "El nombre es requerido"),
        shortName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const newUnit = await db
        .insert(unit)
        .values({
          id: randomUUID(),
          categoryId: input.categoryId,
          name: input.name,
          shortName: input.shortName ?? null,
        })
        .returning();

      return newUnit[0];
    }),

  createActivityLog: protectedProcedure
    .input(
      z.object({
        activityId: z.string().min(1, "La actividad es requerida"),
        date: z.date(),
        value: z.string().min(1, "El valor es requerido"),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Verificar que la actividad pertenece al usuario
      const userActivityResult = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, session.user.id),
            eq(userActivity.activityId, input.activityId)
          )
        )
        .limit(1);

      if (!userActivityResult[0]) {
        throw new Error("Activity not found or access denied");
      }

      // Obtener la actividad para obtener el unitId
      const activityResult = await db
        .select()
        .from(activity)
        .where(eq(activity.id, input.activityId))
        .limit(1);

      if (!activityResult[0]) {
        throw new Error("Activity not found");
      }

      const newLog = await db
        .insert(activityLog)
        .values({
          id: randomUUID(),
          activityId: input.activityId,
          userId: session.user.id,
          unitId: activityResult[0].unitId,
          date: input.date,
          value: input.value,
          note: input.note ?? null,
        })
        .returning();

      return newLog[0];
    }),

  getActivityLogs: protectedProcedure
    .input(
      z.object({
        activityId: z.string().min(1, "La actividad es requerida"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Verificar que la actividad pertenece al usuario
      const userActivityResult = await db
        .select()
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, session.user.id),
            eq(userActivity.activityId, input.activityId)
          )
        )
        .limit(1);

      if (!userActivityResult[0]) {
        throw new Error("Activity not found or access denied");
      }

      // Construir condiciones de filtro
      const conditions = [
        eq(activityLog.activityId, input.activityId),
        eq(activityLog.userId, session.user.id),
      ];

      if (input.startDate) {
        conditions.push(gte(activityLog.date, input.startDate));
      }

      if (input.endDate) {
        // Agregar un día completo al endDate para incluir todo el día
        const endDateWithTime = new Date(input.endDate);
        endDateWithTime.setHours(23, 59, 59, 999);
        conditions.push(lte(activityLog.date, endDateWithTime));
      }

      // Obtener los logs con la unidad
      const logs = await db
        .select({
          log: activityLog,
          unit: unit,
        })
        .from(activityLog)
        .innerJoin(unit, eq(activityLog.unitId, unit.id))
        .where(and(...conditions))
        .orderBy(desc(activityLog.date))
        .limit(input.limit)
        .offset(input.offset);

      // Contar el total de registros que coinciden con los filtros
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLog)
        .where(and(...conditions));

      const totalCount = Number(totalCountResult[0]?.count ?? 0);

      return {
        logs: logs.map((item) => ({
          ...item.log,
          unit: item.unit,
        })),
        totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  getTopRankings: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Obtener todas las actividades del usuario
      const userActivities = await db
        .select({
          activity: activity,
          category: category,
          unit: unit,
        })
        .from(userActivity)
        .innerJoin(activity, eq(userActivity.activityId, activity.id))
        .innerJoin(category, eq(activity.categoryId, category.id))
        .innerJoin(unit, eq(activity.unitId, unit.id))
        .where(eq(userActivity.userId, session.user.id));

      // Construir condiciones de fecha para los logs
      const dateConditions: ReturnType<typeof gte>[] = [];
      if (input.startDate) {
        dateConditions.push(gte(activityLog.date, input.startDate));
      }
      if (input.endDate) {
        const endDateWithTime = new Date(input.endDate);
        endDateWithTime.setHours(23, 59, 59, 999);
        dateConditions.push(lte(activityLog.date, endDateWithTime));
      }

      const rankings = await Promise.all(
        userActivities.map(async (ua) => {
          // Obtener el mejor registro del usuario actual para esta actividad
          const userLogs = await db
            .select({
              value: activityLog.value,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                eq(activityLog.userId, session.user.id),
                ...dateConditions,
              ),
            )
            .orderBy(desc(activityLog.value))
            .limit(1);

          if (!userLogs[0]) {
            return null;
          }

          const userBestValue = Number(userLogs[0]?.value ?? 0);

          // Obtener todos los usuarios que tienen registros en esta actividad
          const allUserLogs = await db
            .select({
              userId: activityLog.userId,
              bestValue: sql<number>`MAX(${activityLog.value})::numeric`,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                ...dateConditions,
              ),
            )
            .groupBy(activityLog.userId);

          // Ordenar por mejor valor (descendente) y calcular la posición
          const sortedLogs = allUserLogs
            .map((log) => ({
              userId: log.userId,
              bestValue: Number(log.bestValue),
            }))
            .sort((a, b) => b.bestValue - a.bestValue);

          const userPosition =
            sortedLogs.findIndex((log) => log.userId === session.user.id) + 1;
          const totalUsers = sortedLogs.length;

          // Calcular el porcentaje de posición (mejor posición = mayor porcentaje)
          const positionPercentage =
            totalUsers > 0
              ? ((totalUsers - userPosition + 1) / totalUsers) * 100
              : 0;

          return {
            activity: ua.activity,
            category: ua.category,
            unit: ua.unit,
            userBestValue,
            position: userPosition,
            totalUsers,
            positionPercentage,
          };
        }),
      );

      // Filtrar nulos, ordenar por posición (mejor primero) y luego por porcentaje
      const validRankings = rankings
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => {
          if (a.position !== b.position) {
            return a.position - b.position;
          }
          return b.positionPercentage - a.positionPercentage;
        });

      // Seleccionar las top 5, priorizando diferentes categorías
      const selectedRankings: (typeof validRankings)[number][] = [];
      const usedCategories = new Set<string>();

      // Primero agregar uno de cada categoría
      for (const ranking of validRankings) {
        if (
          selectedRankings.length < 5 &&
          !usedCategories.has(ranking.category.id)
        ) {
          selectedRankings.push(ranking);
          usedCategories.add(ranking.category.id);
        }
      }

      // Llenar los espacios restantes con las mejores posiciones
      for (const ranking of validRankings) {
        if (selectedRankings.length < 5 && !selectedRankings.includes(ranking)) {
          selectedRankings.push(ranking);
        }
      }

      return selectedRankings.slice(0, 5);
    }),

  getImprovementPercentage: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        compareStartDate: z.date().optional(),
        compareEndDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Si no se proporcionan fechas de comparación, usar el mismo rango anterior
      const periodLength =
        input.endDate.getTime() - input.startDate.getTime();
      let compareStart = input.compareStartDate;
      let compareEnd = input.compareEndDate;

      if (!compareStart || !compareEnd) {
        compareEnd = new Date(input.startDate.getTime() - 1);
        compareStart = new Date(compareEnd.getTime() - periodLength);
      }

      // Obtener actividades del usuario con sus categorías
      const userActivities = await db
        .select({
          activity: activity,
          category: category,
          unit: unit,
        })
        .from(userActivity)
        .innerJoin(activity, eq(userActivity.activityId, activity.id))
        .innerJoin(category, eq(activity.categoryId, category.id))
        .innerJoin(unit, eq(activity.unitId, unit.id))
        .where(eq(userActivity.userId, session.user.id));

      const improvements = await Promise.all(
        userActivities.map(async (ua) => {
          // Calcular promedio del período actual
          const endDateWithTime = new Date(input.endDate);
          endDateWithTime.setHours(23, 59, 59, 999);

          const currentLogs = await db
            .select({
              value: activityLog.value,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                eq(activityLog.userId, session.user.id),
                gte(activityLog.date, input.startDate),
                lte(activityLog.date, endDateWithTime),
              ),
            );

          // Calcular promedio del período anterior
          const compareEndWithTime: Date | undefined = compareEnd ? new Date(compareEnd) : undefined;
          if (compareEndWithTime) {
            compareEndWithTime.setHours(23, 59, 59, 999);
          }

          const previousLogs = await db
            .select({
              value: activityLog.value,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                eq(activityLog.userId, session.user.id),
                ...(compareStart
                  ? [gte(activityLog.date, compareStart)]
                  : []),
                ...(compareEndWithTime
                  ? [lte(activityLog.date, compareEndWithTime)]
                  : []),
              ),
            );

          if (currentLogs.length === 0) {
            return null;
          }

          const currentAvg =
            currentLogs.reduce(
              (sum, log) => sum + Number(log.value),
              0,
            ) / currentLogs.length;

          if (previousLogs.length === 0) {
            // Si no hay datos anteriores, considerar mejora del 0%
            return {
              activity: ua.activity,
              category: ua.category,
              unit: ua.unit,
              currentAvg,
              previousAvg: currentAvg,
              improvementPercentage: 0,
            };
          }

          const previousAvg =
            previousLogs.reduce(
              (sum, log) => sum + Number(log.value),
              0,
            ) / previousLogs.length;

          // Calcular porcentaje de mejora
          const improvementPercentage =
            previousAvg > 0
              ? ((currentAvg - previousAvg) / previousAvg) * 100
              : currentAvg > 0
                ? 100
                : 0;

          return {
            activity: ua.activity,
            category: ua.category,
            unit: ua.unit,
            currentAvg,
            previousAvg,
            improvementPercentage,
          };
        }),
      );

      // Filtrar nulos, ordenar por porcentaje de mejora descendente y seleccionar diferentes categorías
      const validImprovements = improvements
        .filter((i): i is NonNullable<typeof i> => i !== null)
        .sort((a, b) => b.improvementPercentage - a.improvementPercentage);

      // Seleccionar actividades de diferentes categorías con mejor mejora
      const selectedImprovements: (typeof validImprovements)[number][] = [];
      const usedCategories = new Set<string>();

      for (const improvement of validImprovements) {
        if (
          selectedImprovements.length < 5 &&
          !usedCategories.has(improvement.category.id)
        ) {
          selectedImprovements.push(improvement);
          usedCategories.add(improvement.category.id);
        }
      }

      // Llenar los espacios restantes
      for (const improvement of validImprovements) {
        if (
          selectedImprovements.length < 5 &&
          !selectedImprovements.includes(improvement)
        ) {
          selectedImprovements.push(improvement);
        }
      }

      return selectedImprovements.slice(0, 5);
    }),
});
