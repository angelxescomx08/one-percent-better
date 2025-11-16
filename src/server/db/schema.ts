import { relations } from "drizzle-orm";
import {
  boolean,
  numeric,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  index,
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
// CATEGORY  (Lectura, Ejercicio, Estudio...)
// -------------------------------------------------
export const category = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// -------------------------------------------------
// UNIT (páginas, horas, repeticiones)
// Cada unidad pertenece a una categoría
// -------------------------------------------------
export const unit = pgTable(
  "unit",
  {
    id: text("id").primaryKey(),

    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),

    name: text("name").notNull(), // Ej: "páginas"
    shortName: text("short_name"), // Ej: "pag"

    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    // Evita duplicados: (category + name) debe ser único
    unique("unit_category_name_unique").on(table.categoryId, table.name),
  ],
);

// -------------------------------------------------
// ACTIVITY (Actividad creada por el usuario)
// (ej: "Leer libro X", "Correr", "Estudiar Python")
// -------------------------------------------------
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

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
  (table) => [index("activity_user_id_idx").on(table.userId)],
);

// -------------------------------------------------
// ACTIVITY LOG (Registro del usuario)
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

    date: timestamp("date").notNull(), // día exacto del registro
    value: numeric("value").notNull(), // cantidad (númerica)
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
// SESSION (BetterAuth)
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
// ACCOUNT (BetterAuth)
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
// RELATIONS
// -------------------------------------------------

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  activities: many(activity),
  logs: many(activityLog),
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
  user: one(user, { fields: [activity.userId], references: [user.id] }),
  category: one(category, {
    fields: [activity.categoryId],
    references: [category.id],
  }),
  unit: one(unit, {
    fields: [activity.unitId],
    references: [unit.id],
  }),
  logs: many(activityLog),
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

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
