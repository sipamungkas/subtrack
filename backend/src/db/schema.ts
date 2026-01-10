import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum, decimal, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly', 'quarterly', 'custom']);
export const notificationTypeEnum = pgEnum('notification_type', ['telegram']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'failed']);

// Users table (extends better-auth user)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  telegramChatId: varchar('telegram_chat_id', { length: 255 }),
  subscriptionLimit: integer('subscription_limit').notNull().default(15),
  isActive: boolean('is_active').notNull().default(true),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  renewalDate: date('renewal_date').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  billingCycle: billingCycleEnum('billing_cycle').notNull().default('monthly'),
  paymentMethod: text('payment_method').notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  reminderDays: integer('reminder_days').array().notNull().default([7, 3, 1]),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification logs table
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  notificationType: notificationTypeEnum('notification_type').notNull().default('telegram'),
  status: notificationStatusEnum('status').notNull(),
  daysBefore: integer('days_before').notNull(),
});

// Telegram verifications table
export const telegramVerifications = pgTable('telegram_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 8 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  telegramVerifications: many(telegramVerifications),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [notificationLogs.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const telegramVerificationsRelations = relations(telegramVerifications, ({ one }) => ({
  user: one(users, {
    fields: [telegramVerifications.userId],
    references: [users.id],
  }),
}));
