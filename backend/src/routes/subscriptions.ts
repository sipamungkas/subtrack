import { Hono } from 'hono';
import { db } from '../db';
import { subscriptions } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, gte, sql } from 'drizzle-orm';
import { subscriptionQuerySchema } from '../validators/subscription';

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

export default subscriptionRouter;
