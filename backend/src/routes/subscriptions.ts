import { Hono } from 'hono';
import { db } from '../db';
import { subscriptions, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, gte, sql, count } from 'drizzle-orm';
import { subscriptionQuerySchema, createSubscriptionSchema, updateSubscriptionSchema } from '../validators/subscription';

const subscriptionRouter = new Hono();

// All routes require authentication
subscriptionRouter.use('*', requireAuth);

// GET /api/subscriptions - List user's subscriptions
subscriptionRouter.get('/', async (c) => {
  const user = c.get('user');
  const query = subscriptionQuerySchema.safeParse(c.req.query());

  if (!query.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: query.error.message }, 400);
  }

  let conditions = [eq(subscriptions.userId, user.id)];

  if (query.data.active === 'true') {
    conditions.push(eq(subscriptions.isActive, true));
  } else if (query.data.active === 'false') {
    conditions.push(eq(subscriptions.isActive, false));
  }

  if (query.data.upcoming === 'true') {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    conditions.push(gte(subscriptions.renewalDate, thirtyDaysFromNow.toISOString().split('T')[0]));
  }

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(...conditions))
    .orderBy(subscriptions.renewalDate);

  return c.json({ data: userSubscriptions });
});

// GET /api/subscriptions/:id - Get single subscription
subscriptionRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (subscription.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'Subscription not found' }, 404);
  }

  return c.json({ data: subscription[0] });
});

// POST /api/subscriptions - Create new subscription
subscriptionRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const validation = createSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  // Check subscription limit
  const [userRecord] = await db.select().from(users).where(eq(users.id, user.id));
  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.isActive, true)));

  if (subCount.count >= userRecord.subscriptionLimit) {
    return c.json({
      error: 'SUBSCRIPTION_LIMIT_REACHED',
      message: `You've reached your limit of ${userRecord.subscriptionLimit} subscriptions`,
      details: { current: subCount.count, limit: userRecord.subscriptionLimit }
    }, 403);
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
subscriptionRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  // Check subscription exists and belongs to user
  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'Subscription not found' }, 404);
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

export default subscriptionRouter;
