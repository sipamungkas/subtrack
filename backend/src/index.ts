import app from "./app";
import { startBot, stopBot } from "./bot";
import { sendSubscriptionReminders } from "./services/notifications";
import { refreshExchangeRates, pruneOldRates } from "./services/currency";
import cron from "node-cron";

const port = parseInt(process.env.PORT || "3000");

console.log(`🚀 Server running on http://localhost:${port}`);

// Start Telegram bot
startBot().catch(console.error);

// Schedule currency rate update - runs daily at 2 AM UTC (before notifications)
const currencyJob = cron.schedule(
  "0 2 * * *",
  async () => {
    console.log("💱 Running scheduled currency rate update...");
    await refreshExchangeRates();
  },
  {
    timezone: "UTC",
  }
);

// Schedule notification job - runs daily at 8 AM UTC
const notificationJob = cron.schedule(
  "0 8 * * *",
  async () => {
    await sendSubscriptionReminders();
  },
  {
    timezone: "UTC",
  }
);

// Schedule rate pruning - runs weekly on Sunday at 3 AM UTC
const pruneJob = cron.schedule(
  "0 3 * * 0",
  async () => {
    console.log("🧹 Running scheduled rate pruning...");
    await pruneOldRates(30);
  },
  {
    timezone: "UTC",
  }
);

console.log("⏰ Notification scheduler started (daily at 8 AM UTC)");
console.log("💱 Currency rate scheduler started (daily at 2 AM UTC)");
console.log("🧹 Rate pruning scheduler started (weekly on Sunday at 3 AM UTC)");

// For testing: run on startup in development
if (process.env.NODE_ENV === "development") {
  console.log("🧪 Running initial notification check (dev mode)...");
  setTimeout(() => sendSubscriptionReminders(), 5000);

  // Also fetch currency rates on startup in dev mode
  console.log("💱 Running initial currency rate fetch (dev mode)...");
  setTimeout(() => refreshExchangeRates(), 2000);
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  currencyJob.stop();
  notificationJob.stop();
  pruneJob.stop();
  await stopBot();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
  hostname: "0.0.0.0",
};
