import { Bot } from 'grammy';
import { handleStart, handleDisconnect, handleTest } from './commands';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

export const bot = new Bot(botToken);

// Register commands
bot.command('start', handleStart);
bot.command('disconnect', handleDisconnect);
bot.command('test', handleTest);

// Handle unknown commands
bot.on('message', async (ctx) => {
  await ctx.reply(
    'Unknown command. Available commands:\n\n' +
    '/start CODE - Connect your account\n' +
    '/disconnect - Disconnect your account\n' +
    '/test - Send a test notification'
  );
});

export async function startBot() {
  console.log('🤖 Starting Telegram bot...');
  await bot.start();
  console.log('✅ Telegram bot started');
}

export async function stopBot() {
  console.log('🛑 Stopping Telegram bot...');
  await bot.stop();
  console.log('✅ Telegram bot stopped');
}
