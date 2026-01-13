import { Hono } from 'hono';
import { db } from '../db';
import { users, telegramVerifications } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { updateProfileSchema } from '../validators/user';
import { generateVerificationCode, getCodeExpiration, sendTelegramMessage } from '../lib/telegram';

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
      emailVerified: users.emailVerified,
      preferredCurrency: users.preferredCurrency,
    })
    .from(users)
    .where(eq(users.id, user.id));

  return c.json({
    data: {
      ...profile,
      emailVerified: profile.emailVerified ?? false,
    },
  });
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
      preferredCurrency: users.preferredCurrency,
    });

  return c.json({ data: updated });
});

// POST /api/user/telegram/connect - Generate verification code
userRouter.post('/telegram/connect', async (c) => {
  const user = c.get('user');

  // Check if user already has Telegram connected
  const [profile] = await db.select().from(users).where(eq(users.id, user.id));

  if (profile.telegramChatId) {
    return c.json({
      error: 'ALREADY_CONNECTED',
      message: 'Telegram already connected'
    }, 400);
  }

  // Generate verification code
  const code = generateVerificationCode();
  const expiresAt = getCodeExpiration();

  await db.insert(telegramVerifications).values({
    userId: user.id,
    code,
    expiresAt,
  });

  return c.json({
    data: {
      code,
      expiresAt,
      botUsername: process.env.TELEGRAM_BOT_USERNAME,
      message: `Send this command to @${process.env.TELEGRAM_BOT_USERNAME}: /start ${code}`,
    }
  });
});

// DELETE /api/user/telegram/disconnect - Disconnect Telegram
userRouter.delete('/telegram/disconnect', async (c) => {
  const user = c.get('user');

  await db
    .update(users)
    .set({ telegramChatId: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return c.json({ message: 'Telegram disconnected successfully' });
});

// POST /api/user/telegram/test - Send test notification
userRouter.post('/telegram/test', async (c) => {
  const user = c.get('user');

  const [profile] = await db.select().from(users).where(eq(users.id, user.id));

  if (!profile.telegramChatId) {
    return c.json({
      error: 'NOT_CONNECTED',
      message: 'Telegram not connected'
    }, 400);
  }

  const message = '🔔 Test notification from Subnudge!\n\nYou will receive subscription reminders here.';
  const success = await sendTelegramMessage(profile.telegramChatId, message);

  if (!success) {
    return c.json({
      error: 'SEND_FAILED',
      message: 'Failed to send test message'
    }, 500);
  }

  return c.json({ message: 'Test notification sent successfully' });
});

export default userRouter;
