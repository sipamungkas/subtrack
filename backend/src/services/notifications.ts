import { db } from "../db";
import { subscriptions, users, notificationLogs } from "../db/schema";
import { eq, and, sql, lte, inArray } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { maskEmail } from "../lib/mask-email";

interface SubscriptionWithUser {
  subscription: typeof subscriptions.$inferSelect;
  user: typeof users.$inferSelect;
}

export function calculateNextRenewalDate(
  currentDate: Date,
  billingCycle: string,
  customIntervalDays?: number | null
): Date {
  const next = new Date(currentDate);

  switch (billingCycle) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      if (customIntervalDays) {
        next.setDate(next.getDate() + customIntervalDays);
      }
      break;
  }

  return next;
}

export async function advancePassedRenewalDates(): Promise<void> {
  console.log("📅 Checking for passed renewal dates...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active subscriptions with passed renewal dates
  const passedSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.isActive, true),
        sql`${subscriptions.renewalDate} < ${today.toISOString().split("T")[0]}`
      )
    );

  let advancedCount = 0;

  for (const subscription of passedSubscriptions) {
    // Skip custom subscriptions without interval
    if (subscription.billingCycle === "custom" && !subscription.customIntervalDays) {
      continue;
    }

    let renewalDate = new Date(subscription.renewalDate);

    // Keep advancing until we reach a future date
    while (renewalDate < today) {
      renewalDate = calculateNextRenewalDate(
        renewalDate,
        subscription.billingCycle,
        subscription.customIntervalDays
      );
    }

    // Update the subscription
    await db
      .update(subscriptions)
      .set({
        renewalDate: renewalDate.toISOString().split("T")[0],
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    advancedCount++;
  }

  console.log(`📅 Advanced ${advancedCount} subscription renewal dates`);
}

export async function sendSubscriptionReminders(): Promise<void> {
  console.log("🔔 Running subscription reminder check...");

  try {
    // First, advance any passed renewal dates
    await advancePassedRenewalDates();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active subscriptions with users
    const activeSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: users,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.isActive, true),
          eq(users.isActive, true),
          sql`${users.telegramChatId} IS NOT NULL`
        )
      );

    let sentCount = 0;
    let failedCount = 0;

    for (const { subscription, user } of activeSubscriptions) {
      const renewalDate = new Date(subscription.renewalDate);
      const daysUntilRenewal = Math.ceil(
        (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send reminder for this subscription
      if (!subscription.reminderDays.includes(daysUntilRenewal)) {
        continue;
      }

      // Check if notification already sent for this day
      const existingLog = await db
        .select()
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.subscriptionId, subscription.id),
            eq(notificationLogs.daysBefore, daysUntilRenewal),
            sql`DATE(${notificationLogs.sentAt}) = DATE(${today.toISOString()})`
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        continue; // Already sent today
      }

      // Format and send message
      const message = formatReminderMessage(subscription, daysUntilRenewal);
      const success = await sendTelegramMessage(user.telegramChatId!, message);

      // Log notification
      await db.insert(notificationLogs).values({
        subscriptionId: subscription.id,
        notificationType: "telegram",
        status: success ? "sent" : "failed",
        daysBefore: daysUntilRenewal,
      });

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ Reminders sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (error) {
    console.error("❌ Error sending reminders:", error);
  }
}

export function formatReminderMessage(
  subscription: typeof subscriptions.$inferSelect,
  daysUntilRenewal: number
): string {
  const emoji =
    daysUntilRenewal <= 1 ? "🚨" : daysUntilRenewal <= 3 ? "⚠️" : "🔔";

  return (
    `${emoji} *Subscription Reminder*\n\n` +
    `📌 *Service:* ${subscription.serviceName}\n` +
    `⏰ *Renews in:* ${daysUntilRenewal} day${
      daysUntilRenewal !== 1 ? "s" : ""
    }\n` +
    `💵 *Cost:* ${subscription.currency} ${subscription.cost}\n` +
    `💳 *Payment:* ${subscription.paymentMethod}\n` +
    `👤 *Account:* ${subscription.accountName?.includes("@") ? maskEmail(subscription.accountName).replace(/\*/g, '\\*') : subscription.accountName}\n` +
    (subscription.notes ? `\n📝 *Notes:* ${subscription.notes}` : "") +
    `\n\n---\n💬 Need help? @SubnudgeSupport\\_bot | ✉️ support@subnudge.app`
  );
}
