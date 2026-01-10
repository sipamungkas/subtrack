import { Context } from 'grammy';
import { db } from '../db';
import { telegramVerifications, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendTelegramMessage } from '../lib/telegram';

export async function handleStart(ctx: Context) {
  const text = ctx.message?.text || '';
  const parts = text.split(' ');

  // /start without code
  if (parts.length === 1) {
    await ctx.reply(
      '👋 Welcome to SubTrack!\n\n' +
      'To connect your account:\n' +
      '1. Log in to SubTrack web app\n' +
      '2. Go to Profile → Connect Telegram\n' +
      '3. Copy the verification code\n' +
      '4. Send it here using: /start YOUR_CODE'
    );
    return;
  }

  // /start with code
  const code = parts[1];
  const chatId = ctx.chat?.id.toString();

  if (!chatId) {
    await ctx.reply('❌ Unable to get chat ID');
    return;
  }

  try {
    // Verify code via API endpoint
    const response = await fetch(`${process.env.BETTER_AUTH_URL}/api/telegram/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, chatId }),
    });

    const result = await response.json();

    if (response.ok) {
      await ctx.reply('✅ Connected successfully!\n\nYou will receive subscription reminders here.');
    } else {
      await ctx.reply(`❌ ${result.message || 'Connection failed'}`);
    }
  } catch (error) {
    console.error('Bot verification error:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

export async function handleDisconnect(ctx: Context) {
  const chatId = ctx.chat?.id.toString();

  if (!chatId) {
    await ctx.reply('❌ Unable to get chat ID');
    return;
  }

  try {
    // Find user by chat_id and disconnect
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramChatId, chatId))
      .limit(1);

    if (!user) {
      await ctx.reply('❌ No connected account found');
      return;
    }

    await db
      .update(users)
      .set({ telegramChatId: null })
      .where(eq(users.id, user.id));

    await ctx.reply('✅ Disconnected successfully!');
  } catch (error) {
    console.error('Bot disconnect error:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}

export async function handleTest(ctx: Context) {
  const chatId = ctx.chat?.id.toString();

  if (!chatId) {
    await ctx.reply('❌ Unable to get chat ID');
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramChatId, chatId))
      .limit(1);

    if (!user) {
      await ctx.reply('❌ No connected account found. Use /start CODE to connect.');
      return;
    }

    const testMessage =
      '🔔 Test Notification\n\n' +
      'This is how your subscription reminders will look:\n\n' +
      '📌 Service: Netflix\n' +
      '💵 Cost: $15.99\n' +
      '💳 Payment: Visa ending 1234\n' +
      '👤 Account: user@example.com\n\n' +
      '⏰ Renews in 7 days';

    await ctx.reply(testMessage);
  } catch (error) {
    console.error('Bot test error:', error);
    await ctx.reply('❌ An error occurred. Please try again.');
  }
}
