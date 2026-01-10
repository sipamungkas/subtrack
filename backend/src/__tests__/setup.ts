import { beforeEach, vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.BETTER_AUTH_SECRET = 'test-secret';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.TELEGRAM_BOT_USERNAME = 'TestBot';
process.env.NODE_ENV = 'test';

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});
