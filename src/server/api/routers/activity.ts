import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { activity, activityLog, category, unit } from "~/server/db/schema";

export const activityRouter = createTRPCRouter({
  getActivities: protectedProcedure.query(async ({ ctx }) => {
    const { session, db } = ctx;
    const activities = await db
      .selectDistinctOn([activity.id])
      .from(activity)
      .innerJoin(activityLog, eq(activity.id, activityLog.activityId))
      .where(eq(activityLog.userId, session.user.id));

    return activities.map((a) => a.activity);
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
});
