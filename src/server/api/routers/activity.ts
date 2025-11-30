import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activity,
  activityLog,
  category,
  unit,
  user,
  userActivity,
} from "~/server/db/schema";

export const activityRouter = createTRPCRouter({
  getActivities: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const activities = await db
      .select()
      .from(userActivity)
      .innerJoin(activity, eq(userActivity.activityId, activity.id))
      .where(eq(userActivity.userId, session.user.id));

    return activities.map((activity) => activity.activity);
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
            eq(activity.id, input.activityId),
          ),
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
            eq(userActivity.activityId, input.activityId),
          ),
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
            eq(userActivity.activityId, input.activityId),
          ),
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

  getRankingTable: protectedProcedure
    .input(
      z.object({
        activityId: z.string(),
        period: z.enum(["yesterday", "week", "month", "year", "all"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Calcular fechas según el período
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let startDate: Date | undefined;

      switch (input.period) {
        case "yesterday": {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = new Date(weekAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "month": {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = new Date(monthAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "year": {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = new Date(yearAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "all":
          startDate = undefined;
          break;
      }

      // Construir condiciones de fecha
      const dateConditions: ReturnType<typeof gte>[] = [];
      if (startDate) {
        dateConditions.push(gte(activityLog.date, startDate));
      }
      dateConditions.push(lte(activityLog.date, now));

      // Obtener todos los usuarios con sus mejores valores para esta actividad
      const allUserLogs = await db
        .select({
          userId: activityLog.userId,
          userName: user.name,
          userEmail: user.email,
          bestValue: sql<number>`MAX(${activityLog.value})::numeric`,
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.userId, user.id))
        .where(
          and(eq(activityLog.activityId, input.activityId), ...dateConditions),
        )
        .groupBy(activityLog.userId, user.name, user.email);

      // Ordenar por mejor valor (descendente)
      const sortedLogs = allUserLogs
        .map((log) => ({
          userId: log.userId,
          userName: log.userName,
          userEmail: log.userEmail,
          bestValue: Number(log.bestValue),
        }))
        .sort((a, b) => b.bestValue - a.bestValue);

      // Obtener información de la actividad
      const activityInfo = await db
        .select({
          activity: activity,
          category: category,
          unit: unit,
        })
        .from(activity)
        .innerJoin(category, eq(activity.categoryId, category.id))
        .innerJoin(unit, eq(activity.unitId, unit.id))
        .where(eq(activity.id, input.activityId))
        .limit(1);

      if (!activityInfo[0]) {
        throw new Error("Activity not found");
      }

      return {
        activity: activityInfo[0].activity,
        category: activityInfo[0].category,
        unit: activityInfo[0].unit,
        rankings: sortedLogs.map((log, index) => ({
          ...log,
          position: index + 1,
        })),
        currentUserId: session.user.id,
      };
    }),

  getTopRankings: protectedProcedure
    .input(
      z.object({
        period: z.enum(["yesterday", "week", "month", "year", "all"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Calcular fechas según el período
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let startDate: Date | undefined;

      switch (input.period) {
        case "yesterday": {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = new Date(weekAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "month": {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = new Date(monthAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "year": {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = new Date(yearAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "all":
          startDate = undefined;
          break;
      }

      // Construir condiciones de fecha
      const dateConditions: ReturnType<typeof gte>[] = [];
      if (startDate) {
        dateConditions.push(gte(activityLog.date, startDate));
      }
      dateConditions.push(lte(activityLog.date, now));

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
        if (
          selectedRankings.length < 5 &&
          !selectedRankings.includes(ranking)
        ) {
          selectedRankings.push(ranking);
        }
      }

      return selectedRankings.slice(0, 5);
    }),

  getImprovementPercentage: protectedProcedure
    .input(
      z.object({
        period: z.enum(["yesterday", "week", "month", "year", "all"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const now = new Date();
      now.setHours(23, 59, 59, 999);

      // Fechas para HOY (solo el día actual)
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Calcular fechas del período de comparación (promedio anterior, sin incluir hoy)
      let compareStart: Date;
      let compareEnd: Date;

      // Variables para el día a comparar (puede ser hoy o ayer)
      let compareDayStart: Date;
      let compareDayEnd: Date;

      switch (input.period) {
        case "yesterday": {
          // Hoy vs promedio desde el inicio hasta ayer (sin incluir hoy)
          compareDayStart = todayStart;
          compareDayEnd = todayEnd;

          compareStart = new Date(0);

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          compareEnd = yesterday;
          break;
        }
        case "week": {
          // Hoy vs promedio de la última semana (sin incluir hoy)
          compareDayStart = todayStart;
          compareDayEnd = todayEnd;

          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          weekAgo.setHours(0, 0, 0, 0);
          compareStart = weekAgo;

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          compareEnd = yesterday;
          break;
        }
        case "month": {
          // Hoy vs promedio del último mes (sin incluir hoy)
          compareDayStart = todayStart;
          compareDayEnd = todayEnd;

          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          monthAgo.setHours(0, 0, 0, 0);
          compareStart = monthAgo;

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          compareEnd = yesterday;
          break;
        }
        case "year": {
          // Hoy vs promedio del último año (sin incluir hoy)
          compareDayStart = todayStart;
          compareDayEnd = todayEnd;

          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          yearAgo.setHours(0, 0, 0, 0);
          compareStart = yearAgo;

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          compareEnd = yesterday;
          break;
        }
        case "all": {
          // Hoy vs promedio histórico (desde el inicio, sin incluir hoy)
          compareDayStart = todayStart;
          compareDayEnd = todayEnd;

          compareStart = new Date(0);

          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(23, 59, 59, 999);
          compareEnd = yesterday;
          break;
        }
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
          // Calcular promedio del día a comparar (hoy o ayer)
          const todayLogs = await db
            .select({
              value: activityLog.value,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                eq(activityLog.userId, session.user.id),
                gte(activityLog.date, compareDayStart),
                lte(activityLog.date, compareDayEnd),
              ),
            );

          // Si no hay datos de hoy, retornar null
          if (todayLogs.length === 0) {
            return null;
          }

          // Calcular promedio del período anterior (sin incluir hoy)
          const previousLogs = await db
            .select({
              value: activityLog.value,
            })
            .from(activityLog)
            .where(
              and(
                eq(activityLog.activityId, ua.activity.id),
                eq(activityLog.userId, session.user.id),
                gte(activityLog.date, compareStart),
                lte(activityLog.date, compareEnd),
              ),
            );

          // Promedio de hoy
          const currentAvg =
            todayLogs.reduce((sum, log) => sum + Number(log.value), 0) /
            todayLogs.length;

          if (previousLogs.length === 0) {
            // Si no hay datos anteriores, es el primer registro - considerar mejora del 100%
            return {
              activity: ua.activity,
              category: ua.category,
              unit: ua.unit,
              currentAvg,
              previousAvg: 0,
              improvementPercentage: 100,
            };
          }

          // Promedio del período anterior
          const previousAvg =
            previousLogs.reduce((sum, log) => sum + Number(log.value), 0) /
            previousLogs.length;

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

  getProgressHistory: protectedProcedure
    .input(
      z.object({
        period: z.enum(["yesterday", "week", "month", "year", "all"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let startDate: Date;

      // Calcular fecha de inicio según el período
      switch (input.period) {
        case "yesterday": {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = new Date(weekAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "month": {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = new Date(monthAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "year": {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = new Date(yearAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "all":
          startDate = new Date(0);
          break;
      }

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

      // Obtener todos los logs del usuario en el período
      const logs = await db
        .select({
          activityId: activityLog.activityId,
          date: activityLog.date,
          value: activityLog.value,
        })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.userId, session.user.id),
            gte(activityLog.date, startDate),
            lte(activityLog.date, now),
          ),
        )
        .orderBy(activityLog.date);

      // Agrupar datos por período según el tipo seleccionado
      const groupedData: Record<
        string,
        { date: string; value: number; count: number }
      > = {};

      logs.forEach((log) => {
        const logDate = new Date(log.date);
        let key: string = "";

        switch (input.period) {
          case "yesterday":
            // Agrupar por hora
            key = logDate.toISOString().slice(0, 13) + ":00";
            break;
          case "week":
            // Agrupar por día
            key = logDate.toISOString().slice(0, 10);
            break;
          case "month": {
            // Agrupar por semana (lunes a domingo)
            const weekStart = new Date(logDate);
            weekStart.setDate(logDate.getDate() - logDate.getDay() + 1);
            key = weekStart.toISOString().slice(0, 10);
            break;
          }
          case "year":
            // Agrupar por mes
            key = logDate.toISOString().slice(0, 7);
            break;
          case "all":
            // Agrupar por mes
            key = logDate.toISOString().slice(0, 7);
            break;
          default:
            key = logDate.toISOString().slice(0, 10);
            break;
        }

        if (key) {
          if (!groupedData[key]) {
            groupedData[key] = { date: key, value: 0, count: 0 };
          }
          const group = groupedData[key];
          if (group) {
            group.value += Number(log.value);
            group.count += 1;
          }
        }
      });

      // Calcular promedios y formatear
      const chartData = Object.values(groupedData)
        .map((item) => {
          return {
            date: item.date,
            value:
              item.count > 0 ? Number((item.value / item.count).toFixed(2)) : 0,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        data: chartData,
        activities: userActivities.map((ua) => ({
          id: ua.activity.id,
          name: ua.activity.name,
          category: ua.category.name,
          unit: ua.unit.shortName ?? ua.unit.name,
        })),
      };
    }),

  getGeneralRanking: protectedProcedure
    .input(
      z.object({
        period: z.enum(["yesterday", "week", "month", "year", "all"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;

      // Calcular fechas según el período
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let startDate: Date | undefined;

      switch (input.period) {
        case "yesterday": {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "week": {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = new Date(weekAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "month": {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = new Date(monthAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "year": {
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = new Date(yearAgo);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "all":
          startDate = undefined;
          break;
      }

      // Construir condiciones de fecha
      const dateConditions: ReturnType<typeof gte>[] = [];
      if (startDate) {
        dateConditions.push(gte(activityLog.date, startDate));
      }
      dateConditions.push(lte(activityLog.date, now));

      // Obtener todos los usuarios con sus mejores valores por actividad
      const allUserLogs = await db
        .select({
          userId: activityLog.userId,
          userName: user.name,
          userEmail: user.email,
          activityId: activityLog.activityId,
          activityName: activity.name,
          categoryName: category.name,
          bestValue: sql<number>`MAX(${activityLog.value})::numeric`,
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.userId, user.id))
        .innerJoin(activity, eq(activityLog.activityId, activity.id))
        .innerJoin(category, eq(activity.categoryId, category.id))
        .where(and(...dateConditions))
        .groupBy(
          activityLog.userId,
          user.name,
          user.email,
          activityLog.activityId,
          activity.name,
          category.name,
        );

      // Agrupar por usuario y calcular puntuación total (suma de mejores valores)
      const userScores: Record<
        string,
        {
          userId: string;
          userName: string;
          userEmail: string;
          totalScore: number;
          activities: Array<{
            activityId: string;
            activityName: string;
            categoryName: string;
            bestValue: number;
          }>;
        }
      > = {};

      allUserLogs.forEach((log) => {
        if (!userScores[log.userId]) {
          userScores[log.userId] = {
            userId: log.userId,
            userName: log.userName,
            userEmail: log.userEmail,
            totalScore: 0,
            activities: [],
          };
        }
        const userScore = userScores[log.userId];
        if (userScore) {
          const value = Number(log.bestValue);
          userScore.totalScore += value;
          userScore.activities.push({
            activityId: log.activityId,
            activityName: log.activityName,
            categoryName: log.categoryName,
            bestValue: value,
          });
        }
      });

      // Ordenar por puntuación total (descendente)
      const sortedRankings = Object.values(userScores)
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((user, index) => ({
          ...user,
          position: index + 1,
        }));

      return {
        rankings: sortedRankings,
        currentUserId: session.user.id,
      };
    }),
});
