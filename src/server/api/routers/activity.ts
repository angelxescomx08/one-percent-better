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
});
