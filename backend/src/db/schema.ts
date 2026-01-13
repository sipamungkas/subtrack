import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "yearly",
  "quarterly",
  "custom",
]);
export const notificationTypeEnum = pgEnum("notification_type", ["telegram"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "sent",
  "failed",
]);

// Users table (extends better-auth user)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  telegramChatId: varchar("telegram_chat_id", { length: 255 }),
  subscriptionLimit: integer("subscription_limit").notNull().default(15),
  isActive: boolean("is_active").notNull().default(true),
  preferredCurrency: varchar("preferred_currency", { length: 3 })
    .notNull()
    .default("USD"),
  role: roleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const user = users;

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  renewalDate: date("renewal_date").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  customIntervalDays: integer("custom_interval_days"), // Only used when billingCycle = "custom"
  paymentMethod: text("payment_method").notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  reminderDays: integer("reminder_days").array().notNull().default([7, 3, 1]),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Notification logs table
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  notificationType: notificationTypeEnum("notification_type")
    .notNull()
    .default("telegram"),
  status: notificationStatusEnum("status").notNull(),
  daysBefore: integer("days_before").notNull(),
});

// Telegram verifications table
export const telegramVerifications = pgTable("telegram_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 8 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Currency exchange rates table
export const currencyRates = pgTable("currency_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: varchar("base_currency", { length: 10 }).notNull().default("USD"),
  targetCurrency: varchar("target_currency", { length: 10 }).notNull(),
  rate: decimal("rate", { precision: 20, scale: 10 }).notNull(),
  fetchedAt: timestamp("fetched_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  telegramVerifications: many(telegramVerifications),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [subscriptions.userId],
      references: [users.id],
    }),
    notificationLogs: many(notificationLogs),
  })
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [notificationLogs.subscriptionId],
      references: [subscriptions.id],
    }),
  })
);

export const telegramVerificationsRelations = relations(
  telegramVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [telegramVerifications.userId],
      references: [users.id],
    }),
  })
);
