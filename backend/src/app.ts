import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth';
import subscriptionRouter from './routes/subscriptions';
import userRouter from './routes/user';
import telegramRouter from './routes/telegram';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/api/auth', authRouter);
app.route('/api/subscriptions', subscriptionRouter);
app.route('/api/user', userRouter);
app.route('/api/telegram', telegramRouter);

export default app;
