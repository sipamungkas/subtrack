import { Hono } from 'hono';
import { db } from '../db';
import { users, telegramVerifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyTelegramSchema } from '../validators/telegram';

const telegramRouter = new Hono();

// POST /api/telegram/verify - Verify code and save chat_id (called by bot)
telegramRouter.post('/verify', async (c) => {
  const body = await c.req.json();

  const validation = verifyTelegramSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message
    }, 400);
  }

  const { code, chatId } = validation.data;

  // Find verification code
  const [verification] = await db
    .select()
    .from(telegramVerifications)
    .where(
      and(
        eq(telegramVerifications.code, code),
        eq(telegramVerifications.isUsed, false)
      )
    )
    .limit(1);

  if (!verification) {
    return c.json({
      error: 'INVALID_CODE',
      message: 'Invalid or already used verification code'
    }, 400);
  }

  // Check if expired
  if (new Date() > verification.expiresAt) {
    return c.json({
      error: 'CODE_EXPIRED',
      message: 'Verification code has expired'
    }, 400);
  }

  // Update user with chat_id
  await db
    .update(users)
    .set({
      telegramChatId: chatId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, verification.userId));

  // Mark code as used
  await db
    .update(telegramVerifications)
    .set({ isUsed: true })
    .where(eq(telegramVerifications.id, verification.id));

  return c.json({
    success: true,
    message: 'Telegram connected successfully'
  });
});

export default telegramRouter;
