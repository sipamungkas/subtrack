import app from './app';
import { startBot, stopBot } from './bot';

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

// Start Telegram bot
startBot().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await stopBot();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
