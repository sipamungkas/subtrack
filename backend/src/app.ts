import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth';
import subscriptionRouter from './routes/subscriptions';
import userRouter from './routes/user';
import telegramRouter from './routes/telegram';
import adminRouter from './routes/admin';
import currenciesRouter from './routes/currencies';

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(',');

app.use('*', logger());
app.use('*', cors({
  origin: (origin) => allowedOrigins.includes(origin),
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Routes
app.route('/api/auth', authRouter);
app.route('/api/subscriptions', subscriptionRouter);
app.route('/api/user', userRouter);
app.route('/api/telegram', telegramRouter);
app.route('/api/admin', adminRouter);
app.route('/api/currencies', currenciesRouter);

export default app;
