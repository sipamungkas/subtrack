import app from './app';
import { startBot, stopBot } from './bot';
import { sendSubscriptionReminders } from './services/notifications';
import cron from 'node-cron';

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

// Start Telegram bot
startBot().catch(console.error);

// Schedule notification job - runs daily at 8 AM
const notificationJob = cron.schedule('0 8 * * *', async () => {
  await sendSubscriptionReminders();
}, {
  timezone: 'UTC'
});

console.log('⏰ Notification scheduler started (daily at 8 AM UTC)');

// For testing: run on startup in development
if (process.env.NODE_ENV === 'development') {
  console.log('🧪 Running initial notification check (dev mode)...');
  setTimeout(() => sendSubscriptionReminders(), 5000);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  notificationJob.stop();
  await stopBot();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
