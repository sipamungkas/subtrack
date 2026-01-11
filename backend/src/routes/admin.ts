import { Hono } from 'hono';
import { db } from '../db';
import { users, subscriptions, notificationLogs } from '../db/schema';
import { requireAdmin } from '../middleware/auth';
import { eq, count, sql, sum } from 'drizzle-orm';
import { updateUserLimitSchema, updateUserStatusSchema, paginationSchema } from '../validators/admin';
import { sendTelegramMessage } from '../lib/telegram';
import { sendEmail } from '../lib/email';

const adminRouter = new Hono();

adminRouter.use('*', requireAdmin);

// GET /api/admin/users - List all users with pagination
adminRouter.get('/users', async (c) => {
  const query = paginationSchema.safeParse(c.req.query());

  if (!query.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: query.error.message }, 400);
  }

  const { page, limit } = query.data;
  const offset = (page - 1) * limit;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      subscriptionLimit: users.subscriptionLimit,
      isActive: users.isActive,
      telegramConnected: sql<boolean>`${users.telegramChatId} IS NOT NULL`,
      createdAt: users.createdAt,
    })
    .from(users)
    .limit(limit)
    .offset(offset);

  // Get subscription count for each user
  const usersWithCounts = await Promise.all(
    allUsers.map(async (user) => {
      const [subCount] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      return {
        ...user,
        subscriptionCount: subCount.count,
      };
    })
  );

  const [totalCount] = await db.select({ count: count() }).from(users);

  return c.json({
    data: usersWithCounts,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    }
  });
});

// GET /api/admin/users/:id - Get user details
adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id');

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      subscriptionLimit: users.subscriptionLimit,
      isActive: users.isActive,
      telegramChatId: users.telegramChatId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.userId, id));

  return c.json({
    data: {
      ...user,
      subscriptionCount: subCount.count,
    }
  });
});

// PUT /api/admin/users/:id/limit - Update subscription limit
adminRouter.put('/users/:id/limit', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateUserLimitSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message
    }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const oldLimit = user.subscriptionLimit;
  const newLimit = validation.data.subscriptionLimit;

  const [updated] = await db
    .update(users)
    .set({
      subscriptionLimit: newLimit,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  // Send Telegram notification if user has Telegram connected and limit changed
  if (user.telegramChatId && newLimit !== oldLimit) {
    let message: string;

    if (newLimit > oldLimit) {
      message =
        `🎉 *Good News!*\n\n` +
        `Your subscription limit has been increased!\n\n` +
        `📊 *Previous limit:* ${oldLimit}\n` +
        `📈 *New limit:* ${newLimit}\n\n` +
        `You can now track more subscriptions. Enjoy!`;
    } else {
      message =
        `📋 *Limit Update*\n\n` +
        `Your subscription limit has been adjusted.\n\n` +
        `📊 *Previous limit:* ${oldLimit}\n` +
        `📉 *New limit:* ${newLimit}\n\n` +
        `If you have questions, please contact support.`;
    }

    try {
      await sendTelegramMessage(user.telegramChatId, message);
    } catch (error) {
      console.error('Failed to send limit change notification:', error);
      // Don't fail the request if notification fails
    }
  }

  return c.json({ data: updated });
});

// PUT /api/admin/users/:id/status - Enable/disable account
adminRouter.put('/users/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateUserStatusSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message
    }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const [updated] = await db
    .update(users)
    .set({
      isActive: validation.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return c.json({ data: updated });
});

// POST /api/admin/test-email - Test email sending (development only)
adminRouter.post('/test-email', async (c) => {
  const body = await c.req.json();
  const { to } = body;

  if (!to) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'Email address is required' }, 400);
  }

  const result = await sendEmail({
    to,
    subject: 'Test Email from Subnudge',
    text: 'This is a test email to verify your SMTP configuration is working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Test Email</h2>
        <p>This is a test email to verify your SMTP configuration is working correctly.</p>
        <p>If you received this, your email setup is working!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  if (result) {
    return c.json({ success: true, message: `Test email sent to ${to}` });
  } else {
    return c.json({ error: 'EMAIL_FAILED', message: 'Failed to send test email. Check server logs.' }, 500);
  }
});

// GET /api/admin/stats - System statistics
adminRouter.get('/stats', async (c) => {
  // Total users
  const [totalUsers] = await db.select({ count: count() }).from(users);

  // Active users
  const [activeUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));

  // Total subscriptions
  const [totalSubs] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.isActive, true));

  // Total notifications sent
  const [totalNotifications] = await db
    .select({ count: count() })
    .from(notificationLogs);

  // Notifications sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [notificationsToday] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(sql`${notificationLogs.sentAt} >= ${today.toISOString()}`);

  // Failed notifications
  const [failedNotifications] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, 'failed'));

  // Users with Telegram connected
  const [telegramUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.telegramChatId} IS NOT NULL`);

  return c.json({
    data: {
      users: {
        total: totalUsers.count,
        active: activeUsers.count,
        withTelegram: telegramUsers.count,
      },
      subscriptions: {
        total: totalSubs.count,
        averagePerUser: totalUsers.count > 0 ? (totalSubs.count / totalUsers.count).toFixed(2) : 0,
      },
      notifications: {
        total: totalNotifications.count,
        today: notificationsToday.count,
        failed: failedNotifications.count,
        successRate: totalNotifications.count > 0
          ? (((totalNotifications.count - failedNotifications.count) / totalNotifications.count) * 100).toFixed(2)
          : 100,
      },
    }
  });
});

export default adminRouter;
