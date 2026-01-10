import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { updateProfileSchema } from '../validators/user';

const userRouter = new Hono();

userRouter.use('*', requireAuth);

// GET /api/user/profile - Get current user profile
userRouter.get('/profile', async (c) => {
  const user = c.get('user');

  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      telegramChatId: users.telegramChatId,
      subscriptionLimit: users.subscriptionLimit,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, user.id));

  return c.json({ data: profile });
});

// PUT /api/user/profile - Update user profile
userRouter.put('/profile', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const validation = updateProfileSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  const [updated] = await db
    .update(users)
    .set({
      ...validation.data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  return c.json({ data: updated });
});

export default userRouter;
