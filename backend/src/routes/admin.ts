import { Hono } from 'hono';
import { db } from '../db';
import { users, subscriptions, notificationLogs } from '../db/schema';
import { requireAdmin } from '../middleware/auth';
import { eq, count, sql } from 'drizzle-orm';
import { updateUserLimitSchema, updateUserStatusSchema, paginationSchema } from '../validators/admin';

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

  const [updated] = await db
    .update(users)
    .set({
      subscriptionLimit: validation.data.subscriptionLimit,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

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

export default adminRouter;
