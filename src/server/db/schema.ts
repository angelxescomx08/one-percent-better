import { relations } from "drizzle-orm";
import {
  boolean,
  numeric,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

// -----------------------
// USER (BetterAuth uses text IDs, not UUID)
// -----------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(), // <-- FIX FOR BETTERAUTH
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

// -----------------------
// ACTIVITY (UUID ok)
// -----------------------
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id") // <-- FIX userId must be text
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unit: text("unit"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("activity_user_id_idx").on(table.userId)],
);

// -----------------------
// ACTIVITY LOG (UUID ok except FK userId)
// -----------------------
export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activity.id, { onDelete: "cascade" }),

    userId: text("user_id") // <-- FIX userId changed to text
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    value: numeric("value").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("activity_log_user_date_idx").on(table.userId, table.createdAt),
    index("activity_log_activity_date_idx").on(
      table.activityId,
      table.createdAt,
    ),
    index("activity_log_user_activity_date_idx").on(
      table.userId,
      table.activityId,
      table.createdAt,
    ),
  ],
);

// -----------------------
// SESSION (BetterAuth uses text IDs)
// -----------------------
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(), // <-- FIX: BetterAuth session IDs are text
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    userId: text("user_id") // <-- FIX userId must be text
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

// -----------------------
// ACCOUNT (BetterAuth uses text IDs)
// -----------------------
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(), // <-- FIX
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),

    userId: text("user_id") // <-- FIX userId must be text
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

// -----------------------
// VERIFICATION (BetterAuth)
// -----------------------
export const verification = pgTable("verification", {
  id: text("id").primaryKey(), // <-- FIX
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// -----------------------
// RELATIONS
// -----------------------
export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  activities: many(activity),
  logs: many(activityLog),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const activityRelations = relations(activity, ({ one, many }) => ({
  user: one(user, { fields: [activity.userId], references: [user.id] }),
  logs: many(activityLog),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
  activity: one(activity, {
    fields: [activityLog.activityId],
    references: [activity.id],
  }),
}));
