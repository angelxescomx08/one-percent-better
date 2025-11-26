import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

// -------------------------------------------------
// USER (BetterAuth)
// -------------------------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// -------------------------------------------------
// CATEGORY
// -------------------------------------------------
export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("category_name_idx").on(table.name)],
);

// -------------------------------------------------
// UNIT
// -------------------------------------------------
export const unit = pgTable(
  "unit",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortName: text("short_name"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("unit_category_name_unique").on(table.categoryId, table.name),
    index("unit_category_id_idx").on(table.categoryId),
    index("unit_name_idx").on(table.name),
    index("unit_short_name_idx").on(table.shortName),
    index("unit_short_name_category_id_idx").on(
      table.shortName,
      table.categoryId,
    ),
  ],
);

// -------------------------------------------------
// ACTIVITY
// -------------------------------------------------
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    unitId: text("unit_id")
      .notNull()
      .references(() => unit.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("activity_created_idx").on(table.createdAt),
    index("activity_category_id_idx").on(table.categoryId),
    index("activity_unit_id_idx").on(table.unitId),
    index("activity_name_idx").on(table.name),
    index("activity_description_idx").on(table.description),
  ],
);

// -------------------------------------------------
// ACTIVITY LOG
// -------------------------------------------------
export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    unitId: text("unit_id")
      .notNull()
      .references(() => unit.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    value: numeric("value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("activity_log_user_date_idx").on(table.userId, table.date),
    index("activity_log_activity_date_idx").on(table.activityId, table.date),
    index("activity_log_user_activity_date_idx").on(
      table.userId,
      table.activityId,
      table.date,
    ),
  ],
);

// -------------------------------------------------
// USER ACTIVITY (Usuario se apunta a una actividad)
// -------------------------------------------------
export const userActivity = pgTable(
  "user_activity",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("user_activity_unique").on(table.userId, table.activityId),
    index("user_activity_user_idx").on(table.userId),
    index("user_activity_activity_idx").on(table.activityId),
  ],
);

// -------------------------------------------------
// SESSION
// -------------------------------------------------
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

// -------------------------------------------------
// ACCOUNT
// -------------------------------------------------
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

// -------------------------------------------------
// VERIFICATION
// -------------------------------------------------
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// -------------------------------------------------
// USER ACCESS (Stripe & Trial Control)
// -------------------------------------------------
export const userAccess = pgTable(
  "user_access",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Control de Acceso
    hasLifetimeAccess: boolean("has_lifetime_access")
      .$defaultFn(() => false)
      .notNull(),
    trialEndsAt: timestamp("trial_ends_at").notNull(), // Fecha límite del trial

    // Datos de Stripe
    stripeCustomerId: text("stripe_customer_id"), // Para mapear webhooks de Stripe al usuario
    stripePaymentIntentId: text("stripe_payment_intent_id"), // Referencia del pago único
    stripeSubscriptionId: text("stripe_subscription_id"), // ID de la suscripción activa
    subscriptionStatus: text("subscription_status"), // active, canceled, past_due, etc.
    subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"), // Fin del periodo actual
    subscriptionCurrentPeriodStart: timestamp("subscription_current_period_start"), // Inicio del periodo actual
    subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end")
      .$defaultFn(() => false)
      .notNull(), // Si está cancelada pero sigue activa hasta el fin del periodo

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // 1. Acceso rápido por ID de usuario (Middleware / Login check)
    // Es unique porque un usuario solo debe tener un registro de acceso
    unique("user_access_user_id_unique").on(table.userId),

    // 2. Acceso rápido por ID de cliente de Stripe (Webhooks de Stripe)
    unique("user_access_stripe_customer_idx").on(table.stripeCustomerId),

    // 3. Consultas para Cron Jobs: "Buscar usuarios cuyo trial vence hoy y no han pagado"
    index("user_access_trial_expiration_idx").on(
      table.hasLifetimeAccess,
      table.trialEndsAt,
    ),

    // 4. Consultas de soporte: Buscar transacción específica
    index("user_access_payment_intent_idx").on(table.stripePaymentIntentId),

    // 5. Analíticas: Cuántos usuarios tienen acceso de por vida
    index("user_access_lifetime_status_idx").on(table.hasLifetimeAccess),

    // 6. Consultas de suscripciones: Buscar por estado de suscripción
    index("user_access_subscription_status_idx").on(table.subscriptionStatus),
  ],
);

// -------------------------------------------------
// RELATIONS
// -------------------------------------------------

export const userRelations = relations(user, ({ one, many }) => ({
  account: many(account),
  session: many(session),
  activities: many(activity),
  logs: many(activityLog),
  userActivities: many(userActivity),
  access: one(userAccess, {
    fields: [user.id],
    references: [userAccess.userId],
  }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  units: many(unit),
  activities: many(activity),
}));

export const unitRelations = relations(unit, ({ one, many }) => ({
  category: one(category, {
    fields: [unit.categoryId],
    references: [category.id],
  }),
  activities: many(activity),
  logs: many(activityLog),
}));

export const activityRelations = relations(activity, ({ one, many }) => ({
  category: one(category, {
    fields: [activity.categoryId],
    references: [category.id],
  }),
  unit: one(unit, {
    fields: [activity.unitId],
    references: [unit.id],
  }),
  logs: many(activityLog),
  userActivities: many(userActivity),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
  activity: one(activity, {
    fields: [activityLog.activityId],
    references: [activity.id],
  }),
  unit: one(unit, {
    fields: [activityLog.unitId],
    references: [unit.id],
  }),
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(user, {
    fields: [userActivity.userId],
    references: [user.id],
  }),
  activity: one(activity, {
    fields: [userActivity.activityId],
    references: [activity.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const userAccessRelations = relations(userAccess, ({ one }) => ({
  user: one(user, { fields: [userAccess.userId], references: [user.id] }),
}));