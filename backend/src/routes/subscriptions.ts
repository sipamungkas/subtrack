import { Hono } from "hono";
import { formatReminderMessage } from "../services/notifications";
import { convertAmount, getAllLatestRates } from "../services/currency";
import { db } from "../db";
import { subscriptions, users } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import {
  subscriptionQuerySchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from "../validators/subscription";

const subscriptionRouter = new Hono();

// All routes require authentication
subscriptionRouter.use("*", requireAuth);

// GET /api/subscriptions - List user's subscriptions
subscriptionRouter.get("/", async (c) => {
  const user = c.get("user");
  const query = subscriptionQuerySchema.safeParse(c.req.query());

  if (!query.success) {
    return c.json(
      { error: "VALIDATION_ERROR", message: query.error.message },
      400
    );
  }

  let conditions = [eq(subscriptions.userId, user.id)];

  if (query.data.active === "true") {
    conditions.push(eq(subscriptions.isActive, true));
  } else if (query.data.active === "false") {
    conditions.push(eq(subscriptions.isActive, false));
  }

  if (query.data.upcoming === "true") {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    conditions.push(
      gte(
        subscriptions.renewalDate,
        thirtyDaysFromNow.toISOString().split("T")[0]
      )
    );
  }

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(...conditions))
    .orderBy(subscriptions.renewalDate);

  return c.json({ data: userSubscriptions });
});

// GET /api/subscriptions/stats - Get user's subscription statistics with currency conversion
// NOTE: This route MUST be defined before /:id to avoid "stats" being matched as an id
subscriptionRouter.get("/stats", async (c) => {
  const user = c.get("user");

  // Get all active subscriptions for the user
  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.isActive, true)
      )
    );

  // Helper function to normalize cost to monthly
  const normalizeToMonthlyCost = (
    cost: number,
    billingCycle: string
  ): number => {
    switch (billingCycle) {
      case "yearly":
        return cost / 12;
      case "quarterly":
        return cost / 3;
      case "monthly":
      case "custom":
      default:
        return cost;
    }
  };

  // Calculate costs with currency conversion
  const costBreakdown: Array<{
    currency: string;
    amount: number;
    convertedToUSD: number;
  }> = [];

  // Group subscriptions by currency (normalized to monthly cost)
  const byCurrency: Record<string, number> = {};
  for (const sub of userSubscriptions) {
    const currency = sub.currency || "USD";
    const cost = parseFloat(sub.cost);
    const monthlyCost = normalizeToMonthlyCost(cost, sub.billingCycle);
    byCurrency[currency] = (byCurrency[currency] || 0) + monthlyCost;
  }

  // Convert each currency to USD
  let totalMonthlyCostUSD = 0;
  for (const [currency, amount] of Object.entries(byCurrency)) {
    const convertedToUSD = await convertAmount(amount, currency, "USD");
    costBreakdown.push({
      currency,
      amount,
      convertedToUSD: Math.round(convertedToUSD * 100) / 100,
    });
    totalMonthlyCostUSD += convertedToUSD;
  }

  // Get upcoming renewals (next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingRenewals = userSubscriptions.filter((sub) => {
    const renewalDate = new Date(sub.renewalDate);
    return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
  }).sort((a, b) =>
    new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime()
  ).slice(0, 5);

  // Get exchange rates info
  const { updatedAt: ratesUpdatedAt } = await getAllLatestRates();

  return c.json({
    data: {
      totalSubscriptions: userSubscriptions.length,
      monthlyCost: {
        amount: Math.round(totalMonthlyCostUSD * 100) / 100,
        currency: "USD",
      },
      yearlyCost: {
        amount: Math.round(totalMonthlyCostUSD * 12 * 100) / 100,
        currency: "USD",
      },
      upcomingRenewalsCount: upcomingRenewals.length,
      upcomingRenewals,
      costBreakdown,
      ratesUpdatedAt: ratesUpdatedAt?.toISOString() || null,
    },
  });
});

// GET /api/subscriptions/:id - Get single subscription
subscriptionRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (subscription.length === 0) {
    return c.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      404
    );
  }

  return c.json({ data: subscription[0] });
});

// POST /api/subscriptions - Create new subscription
subscriptionRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const validation = createSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json(
      {
        error: "VALIDATION_ERROR",
        message: validation.error.message,
        details: validation.error.errors,
      },
      400
    );
  }

  // Check subscription limit
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, user.id), eq(subscriptions.isActive, true))
    );

  if (subCount.count >= userRecord.subscriptionLimit) {
    return c.json(
      {
        error: "SUBSCRIPTION_LIMIT_REACHED",
        message: `You've reached your limit of ${userRecord.subscriptionLimit} subscriptions`,
        details: {
          current: subCount.count,
          limit: userRecord.subscriptionLimit,
        },
      },
      403
    );
  }

  const [newSubscription] = await db
    .insert(subscriptions)
    .values({
      ...validation.data,
      userId: user.id,
    })
    .returning();

  return c.json({ data: newSubscription }, 201);
});

// PUT /api/subscriptions/:id - Update subscription
subscriptionRouter.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  const validation = updateSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json(
      {
        error: "VALIDATION_ERROR",
        message: validation.error.message,
        details: validation.error.errors,
      },
      400
    );
  }

  // Check subscription exists and belongs to user
  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      404
    );
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      ...validation.data,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .returning();

  return c.json({ data: updated });
});

// DELETE /api/subscriptions/:id - Soft delete subscription
subscriptionRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  // Check subscription exists and belongs to user
  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      404
    );
  }

  await db
    .update(subscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));

  return c.json({ message: "Subscription deleted successfully" });
});

// POST /api/subscriptions/:id/test-notification - Send test notification for subscription
subscriptionRouter.post("/:id/test-notification", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const { sendTelegramMessage } = await import("../lib/telegram");

  // Check subscription exists and belongs to user
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (!subscription) {
    return c.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      404
    );
  }

  // Get user's telegram chat ID
  const [userRecord] = await db
    .select({ telegramChatId: users.telegramChatId })
    .from(users)
    .where(eq(users.id, user.id));

  if (!userRecord.telegramChatId) {
    return c.json(
      {
        error: "NOT_CONNECTED",
        message:
          "Telegram not connected. Please connect your Telegram account in settings.",
      },
      400
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewalDate = new Date(subscription.renewalDate);
  const daysUntilRenewal = Math.ceil(
    (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const message = formatReminderMessage(
    subscription as typeof subscriptions.$inferSelect,
    daysUntilRenewal
  );
  const success = await sendTelegramMessage(userRecord.telegramChatId, message);

  if (!success) {
    return c.json(
      {
        error: "SEND_FAILED",
        message: "Failed to send Telegram message",
      },
      500
    );
  }

  return c.json({ message: "Test notification sent successfully" });
});

export default subscriptionRouter;
