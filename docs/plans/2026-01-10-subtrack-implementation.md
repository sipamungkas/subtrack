# SubTrack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a subscription tracking web application with Telegram notifications for freelancers and small businesses.

**Architecture:** Separate frontend (Vite + React) and backend (Bun + Hono) apps. Backend uses Drizzle ORM with NeonDB PostgreSQL. Better-auth handles authentication with JWT tokens. Telegram Bot API for notifications via cron job scheduler.

**Tech Stack:** Bun, Hono, Drizzle ORM, NeonDB, Better-auth, Telegram Bot API, Vite, React, shadcn/ui, TanStack Query, React Router, Zod

---

## Phase 1: Backend Foundation

### Task 1.1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/tsconfig.json`

**Step 1: Create backend directory and initialize Bun project**

Run: `mkdir backend && cd backend && bun init -y`

**Step 2: Install core dependencies**

Run:
```bash
bun add hono @hono/node-server drizzle-orm postgres drizzle-kit better-auth zod
bun add -d @types/node
```

**Step 3: Create tsconfig.json**

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create .env.example**

Create `backend/.env.example`:
```env
DATABASE_URL=postgresql://user:password@host/database
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=YourBot
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
```

**Step 5: Create .gitignore**

Create `backend/.gitignore`:
```
node_modules/
.env
dist/
*.log
.DS_Store
```

**Step 6: Commit**

Run:
```bash
git add backend/
git commit -m "chore: initialize backend project with Bun, Hono, and Drizzle"
```

---

### Task 1.2: Setup Database Schema

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/drizzle.config.ts`

**Step 1: Create drizzle config**

Create `backend/drizzle.config.ts`:
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 2: Create database schema**

Create `backend/src/db/schema.ts`:
```typescript
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum, decimal, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly', 'quarterly', 'custom']);
export const notificationTypeEnum = pgEnum('notification_type', ['telegram']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'failed']);

// Users table (extends better-auth user)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  telegramChatId: varchar('telegram_chat_id', { length: 255 }),
  subscriptionLimit: integer('subscription_limit').notNull().default(15),
  isActive: boolean('is_active').notNull().default(true),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  renewalDate: date('renewal_date').notNull(),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  billingCycle: billingCycleEnum('billing_cycle').notNull().default('monthly'),
  paymentMethod: text('payment_method').notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  reminderDays: integer('reminder_days').array().notNull().default([7, 3, 1]),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Notification logs table
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  notificationType: notificationTypeEnum('notification_type').notNull().default('telegram'),
  status: notificationStatusEnum('status').notNull(),
  daysBefore: integer('days_before').notNull(),
});

// Telegram verifications table
export const telegramVerifications = pgTable('telegram_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 8 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  telegramVerifications: many(telegramVerifications),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [notificationLogs.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const telegramVerificationsRelations = relations(telegramVerifications, ({ one }) => ({
  user: one(users, {
    fields: [telegramVerifications.userId],
    references: [users.id],
  }),
}));
```

**Step 3: Generate migration**

Run: `bunx drizzle-kit generate:pg`
Expected: Migration files created in `drizzle/` directory

**Step 4: Commit**

Run:
```bash
git add backend/src/db/ backend/drizzle.config.ts backend/drizzle/
git commit -m "feat: add database schema with Drizzle ORM"
```

---

### Task 1.3: Setup Database Connection

**Files:**
- Create: `backend/src/db/index.ts`

**Step 1: Create database connection**

Create `backend/src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const queryClient = postgres(process.env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });
```

**Step 2: Install postgres client**

Run: `bun add postgres`

**Step 3: Commit**

Run:
```bash
git add backend/src/db/index.ts
git commit -m "feat: add database connection with Drizzle"
```

---

### Task 1.4: Setup Hono App Structure

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/cors.ts`

**Step 1: Create main app file**

Create `backend/src/app.ts`:
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// API routes will be added here
app.get('/api', (c) => c.json({ message: 'SubTrack API' }));

export default app;
```

**Step 2: Create entry point**

Create `backend/src/index.ts`:
```typescript
import app from './app';

const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

**Step 3: Update package.json scripts**

Modify `backend/package.json` to add scripts:
```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "start": "bun dist/index.js",
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg"
  }
}
```

**Step 4: Test server runs**

Run: `cd backend && bun run dev`
Expected: Server starts on port 3000, visit http://localhost:3000/health

**Step 5: Commit**

Run:
```bash
git add backend/src/
git commit -m "feat: setup Hono app with basic middleware"
```

---

## Phase 2: Better-Auth Integration

### Task 2.1: Configure Better-Auth

**Files:**
- Create: `backend/src/lib/auth.ts`
- Create: `backend/src/routes/auth.ts`

**Step 1: Install better-auth and dependencies**

Run: `cd backend && bun add better-auth`

**Step 2: Create auth configuration**

Create `backend/src/lib/auth.ts`:
```typescript
import { betterAuth } from 'better-auth';
import { db } from '../db';

export const auth = betterAuth({
  database: {
    provider: 'postgres',
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
});

export type Auth = typeof auth;
```

**Step 3: Create auth routes**

Create `backend/src/routes/auth.ts`:
```typescript
import { Hono } from 'hono';
import { auth } from '../lib/auth';

const authRouter = new Hono();

// Better-auth handles all auth routes
authRouter.all('/*', (c) => auth.handler(c.req.raw));

export default authRouter;
```

**Step 4: Mount auth routes in app**

Modify `backend/src/app.ts`:
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRouter from './routes/auth';

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

export default app;
```

**Step 5: Commit**

Run:
```bash
git add backend/src/lib/ backend/src/routes/
git commit -m "feat: integrate Better-auth for authentication"
```

---

### Task 2.2: Create Auth Middleware

**Files:**
- Create: `backend/src/middleware/auth.ts`

**Step 1: Create authentication middleware**

Create `backend/src/middleware/auth.ts`:
```typescript
import { Context, Next } from 'hono';
import { auth } from '../lib/auth';

export const requireAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};

export const requireAdmin = async (c: Context, next: Next) => {
  await requireAuth(c, next);

  const user = c.get('user');

  if (user.role !== 'admin') {
    return c.json({ error: 'FORBIDDEN', message: 'Admin access required' }, 403);
  }

  await next();
};
```

**Step 2: Commit**

Run:
```bash
git add backend/src/middleware/auth.ts
git commit -m "feat: add authentication and authorization middleware"
```

---

## Phase 3: Subscription API

### Task 3.1: Create Subscription Routes - List and Get

**Files:**
- Create: `backend/src/routes/subscriptions.ts`
- Create: `backend/src/validators/subscription.ts`

**Step 1: Create validation schemas**

Create `backend/src/validators/subscription.ts`:
```typescript
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  serviceName: z.string().min(1).max(255),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('USD'),
  billingCycle: z.enum(['monthly', 'yearly', 'quarterly', 'custom']).default('monthly'),
  paymentMethod: z.string().min(1),
  accountName: z.string().min(1).max(255),
  reminderDays: z.array(z.number().int().positive()).default([7, 3, 1]),
  notes: z.string().optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

export const subscriptionQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});
```

**Step 2: Create subscription routes - GET operations**

Create `backend/src/routes/subscriptions.ts`:
```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { subscriptions } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and, gte, sql } from 'drizzle-orm';
import { subscriptionQuerySchema } from '../validators/subscription';

const subscriptionRouter = new Hono();

// All routes require authentication
subscriptionRouter.use('*', requireAuth);

// GET /api/subscriptions - List user's subscriptions
subscriptionRouter.get('/', async (c) => {
  const user = c.get('user');
  const query = subscriptionQuerySchema.safeParse(c.req.query());

  if (!query.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: query.error.message }, 400);
  }

  let conditions = [eq(subscriptions.userId, user.id)];

  if (query.data.active === 'true') {
    conditions.push(eq(subscriptions.isActive, true));
  } else if (query.data.active === 'false') {
    conditions.push(eq(subscriptions.isActive, false));
  }

  if (query.data.upcoming === 'true') {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    conditions.push(gte(subscriptions.renewalDate, thirtyDaysFromNow.toISOString().split('T')[0]));
  }

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(...conditions))
    .orderBy(subscriptions.renewalDate);

  return c.json({ data: userSubscriptions });
});

// GET /api/subscriptions/:id - Get single subscription
subscriptionRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (subscription.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'Subscription not found' }, 404);
  }

  return c.json({ data: subscription[0] });
});

export default subscriptionRouter;
```

**Step 3: Mount subscription routes**

Modify `backend/src/app.ts` to add subscription routes:
```typescript
import subscriptionRouter from './routes/subscriptions';

// ... existing code ...

app.route('/api/subscriptions', subscriptionRouter);
```

**Step 4: Commit**

Run:
```bash
git add backend/src/routes/subscriptions.ts backend/src/validators/
git commit -m "feat: add subscription list and get endpoints"
```

---

### Task 3.2: Create Subscription Routes - Create and Update

**Files:**
- Modify: `backend/src/routes/subscriptions.ts`

**Step 1: Add POST endpoint for creating subscriptions**

Modify `backend/src/routes/subscriptions.ts` to add:
```typescript
import { createSubscriptionSchema, updateSubscriptionSchema } from '../validators/subscription';
import { count } from 'drizzle-orm';
import { users } from '../db/schema';

// POST /api/subscriptions - Create new subscription
subscriptionRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const validation = createSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  // Check subscription limit
  const [userRecord] = await db.select().from(users).where(eq(users.id, user.id));
  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.isActive, true)));

  if (subCount.count >= userRecord.subscriptionLimit) {
    return c.json({
      error: 'SUBSCRIPTION_LIMIT_REACHED',
      message: `You've reached your limit of ${userRecord.subscriptionLimit} subscriptions`,
      details: { current: subCount.count, limit: userRecord.subscriptionLimit }
    }, 403);
  }

  const [newSubscription] = await db
    .insert(subscriptions)
    .values({
      ...validation.data,
      userId: user.id,
    })
    .returning();

  return c.json({ data: newSubscription }, 201);
});

// PUT /api/subscriptions/:id - Update subscription
subscriptionRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message,
      details: validation.error.errors
    }, 400);
  }

  // Check subscription exists and belongs to user
  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'Subscription not found' }, 404);
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      ...validation.data,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .returning();

  return c.json({ data: updated });
});
```

**Step 2: Commit**

Run:
```bash
git add backend/src/routes/subscriptions.ts
git commit -m "feat: add subscription create and update endpoints"
```

---

### Task 3.3: Create Subscription Routes - Delete and Stats

**Files:**
- Modify: `backend/src/routes/subscriptions.ts`

**Step 1: Add DELETE and stats endpoints**

Modify `backend/src/routes/subscriptions.ts` to add:
```typescript
import { sum } from 'drizzle-orm';

// DELETE /api/subscriptions/:id - Soft delete subscription
subscriptionRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // Check subscription exists and belongs to user
  const existing = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'Subscription not found' }, 404);
  }

  await db
    .update(subscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));

  return c.json({ message: 'Subscription deleted successfully' });
});

// GET /api/subscriptions/stats - Get user's subscription statistics
subscriptionRouter.get('/stats', async (c) => {
  const user = c.get('user');

  const [stats] = await db
    .select({
      totalCount: count(),
      totalCost: sum(subscriptions.cost),
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.isActive, true)));

  // Get upcoming renewals (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingRenewals = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.isActive, true),
        gte(subscriptions.renewalDate, new Date().toISOString().split('T')[0])
      )
    )
    .orderBy(subscriptions.renewalDate)
    .limit(5);

  return c.json({
    data: {
      totalSubscriptions: stats.totalCount || 0,
      totalMonthlyCost: stats.totalCost || '0',
      upcomingRenewals,
    }
  });
});
```

**Step 2: Commit**

Run:
```bash
git add backend/src/routes/subscriptions.ts
git commit -m "feat: add subscription delete and stats endpoints"
```

---

## Phase 4: User Profile & Telegram Integration

### Task 4.1: User Profile Routes

**Files:**
- Create: `backend/src/routes/user.ts`
- Create: `backend/src/validators/user.ts`

**Step 1: Create user validation schemas**

Create `backend/src/validators/user.ts`:
```typescript
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});
```

**Step 2: Create user profile routes**

Create `backend/src/routes/user.ts`:
```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { updateProfileSchema } from '../validators/user';

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
    })
    .from(users)
    .where(eq(users.id, user.id));

  return c.json({ data: profile });
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
    });

  return c.json({ data: updated });
});

export default userRouter;
```

**Step 3: Mount user routes**

Modify `backend/src/app.ts`:
```typescript
import userRouter from './routes/user';

// ... existing code ...

app.route('/api/user', userRouter);
```

**Step 4: Commit**

Run:
```bash
git add backend/src/routes/user.ts backend/src/validators/user.ts
git commit -m "feat: add user profile endpoints"
```

---

### Task 4.2: Telegram Connection - Generate Code

**Files:**
- Modify: `backend/src/routes/user.ts`
- Create: `backend/src/lib/telegram.ts`

**Step 1: Create Telegram utilities**

Create `backend/src/lib/telegram.ts`:
```typescript
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getCodeExpiration(): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration;
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram API error:', error);
    return false;
  }
}
```

**Step 2: Add Telegram connection endpoints to user routes**

Modify `backend/src/routes/user.ts`:
```typescript
import { telegramVerifications } from '../db/schema';
import { generateVerificationCode, getCodeExpiration, sendTelegramMessage } from '../lib/telegram';

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

  const message = '🔔 Test notification from SubTrack!\n\nYou will receive subscription reminders here.';
  const success = await sendTelegramMessage(profile.telegramChatId, message);

  if (!success) {
    return c.json({
      error: 'SEND_FAILED',
      message: 'Failed to send test message'
    }, 500);
  }

  return c.json({ message: 'Test notification sent successfully' });
});
```

**Step 3: Commit**

Run:
```bash
git add backend/src/routes/user.ts backend/src/lib/telegram.ts
git commit -m "feat: add Telegram connection and test endpoints"
```

---

### Task 4.3: Telegram Verification Endpoint

**Files:**
- Create: `backend/src/routes/telegram.ts`
- Create: `backend/src/validators/telegram.ts`

**Step 1: Create telegram validation schema**

Create `backend/src/validators/telegram.ts`:
```typescript
import { z } from 'zod';

export const verifyTelegramSchema = z.object({
  code: z.string().length(8),
  chatId: z.string().min(1),
});
```

**Step 2: Create telegram verification route**

Create `backend/src/routes/telegram.ts`:
```typescript
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
```

**Step 3: Mount telegram routes**

Modify `backend/src/app.ts`:
```typescript
import telegramRouter from './routes/telegram';

// ... existing code ...

app.route('/api/telegram', telegramRouter);
```

**Step 4: Commit**

Run:
```bash
git add backend/src/routes/telegram.ts backend/src/validators/telegram.ts
git commit -m "feat: add Telegram verification endpoint"
```

---

## Phase 5: Admin Routes

### Task 5.1: Admin User Management

**Files:**
- Create: `backend/src/routes/admin.ts`
- Create: `backend/src/validators/admin.ts`

**Step 1: Create admin validation schemas**

Create `backend/src/validators/admin.ts`:
```typescript
import { z } from 'zod';

export const updateUserLimitSchema = z.object({
  subscriptionLimit: z.number().int().positive().min(1).max(1000),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});
```

**Step 2: Create admin routes**

Create `backend/src/routes/admin.ts`:
```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { users, subscriptions, notificationLogs } from '../db/schema';
import { requireAdmin } from '../middleware/auth';
import { eq, count, sql } from 'drizzle-orm';
import { updateUserLimitSchema, updateUserStatusSchema, paginationSchema } from '../validators/admin';

const adminRouter = new Hono();

adminRouter.use('*', requireAdmin);

// GET /api/admin/users - List all users with pagination
adminRouter.get('/users', async (c) => {
  const query = paginationSchema.safeParse(c.req.query());

  if (!query.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: query.error.message }, 400);
  }

  const { page, limit } = query.data;
  const offset = (page - 1) * limit;

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      subscriptionLimit: users.subscriptionLimit,
      isActive: users.isActive,
      telegramConnected: sql<boolean>`${users.telegramChatId} IS NOT NULL`,
      createdAt: users.createdAt,
    })
    .from(users)
    .limit(limit)
    .offset(offset);

  // Get subscription count for each user
  const usersWithCounts = await Promise.all(
    allUsers.map(async (user) => {
      const [subCount] = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      return {
        ...user,
        subscriptionCount: subCount.count,
      };
    })
  );

  const [totalCount] = await db.select({ count: count() }).from(users);

  return c.json({
    data: usersWithCounts,
    pagination: {
      page,
      limit,
      total: totalCount.count,
      totalPages: Math.ceil(totalCount.count / limit),
    }
  });
});

// GET /api/admin/users/:id - Get user details
adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id');

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      subscriptionLimit: users.subscriptionLimit,
      isActive: users.isActive,
      telegramChatId: users.telegramChatId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.userId, id));

  return c.json({
    data: {
      ...user,
      subscriptionCount: subCount.count,
    }
  });
});

// PUT /api/admin/users/:id/limit - Update subscription limit
adminRouter.put('/users/:id/limit', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateUserLimitSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message
    }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const [updated] = await db
    .update(users)
    .set({
      subscriptionLimit: validation.data.subscriptionLimit,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return c.json({ data: updated });
});

// PUT /api/admin/users/:id/status - Enable/disable account
adminRouter.put('/users/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const validation = updateUserStatusSchema.safeParse(body);

  if (!validation.success) {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: validation.error.message
    }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    return c.json({ error: 'NOT_FOUND', message: 'User not found' }, 404);
  }

  const [updated] = await db
    .update(users)
    .set({
      isActive: validation.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return c.json({ data: updated });
});

export default adminRouter;
```

**Step 3: Mount admin routes**

Modify `backend/src/app.ts`:
```typescript
import adminRouter from './routes/admin';

// ... existing code ...

app.route('/api/admin', adminRouter);
```

**Step 4: Commit**

Run:
```bash
git add backend/src/routes/admin.ts backend/src/validators/admin.ts
git commit -m "feat: add admin user management endpoints"
```

---

### Task 5.2: Admin Stats Dashboard

**Files:**
- Modify: `backend/src/routes/admin.ts`

**Step 1: Add stats endpoint**

Modify `backend/src/routes/admin.ts` to add:
```typescript
import { sum } from 'drizzle-orm';

// GET /api/admin/stats - System statistics
adminRouter.get('/stats', async (c) => {
  // Total users
  const [totalUsers] = await db.select({ count: count() }).from(users);

  // Active users
  const [activeUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));

  // Total subscriptions
  const [totalSubs] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.isActive, true));

  // Total notifications sent
  const [totalNotifications] = await db
    .select({ count: count() })
    .from(notificationLogs);

  // Notifications sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [notificationsToday] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(sql`${notificationLogs.sentAt} >= ${today.toISOString()}`);

  // Failed notifications
  const [failedNotifications] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.status, 'failed'));

  // Users with Telegram connected
  const [telegramUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.telegramChatId} IS NOT NULL`);

  return c.json({
    data: {
      users: {
        total: totalUsers.count,
        active: activeUsers.count,
        withTelegram: telegramUsers.count,
      },
      subscriptions: {
        total: totalSubs.count,
        averagePerUser: totalUsers.count > 0 ? (totalSubs.count / totalUsers.count).toFixed(2) : 0,
      },
      notifications: {
        total: totalNotifications.count,
        today: notificationsToday.count,
        failed: failedNotifications.count,
        successRate: totalNotifications.count > 0
          ? (((totalNotifications.count - failedNotifications.count) / totalNotifications.count) * 100).toFixed(2)
          : 100,
      },
    }
  });
});
```

**Step 2: Commit**

Run:
```bash
git add backend/src/routes/admin.ts
git commit -m "feat: add admin stats dashboard endpoint"
```

---

## Phase 6: Telegram Bot

### Task 6.1: Setup Telegram Bot

**Files:**
- Create: `backend/src/bot/index.ts`
- Create: `backend/src/bot/commands.ts`

**Step 1: Install telegram bot dependencies**

Run: `cd backend && bun add grammy`

**Step 2: Create bot command handlers**

Create `backend/src/bot/commands.ts`:
```typescript
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
```

**Step 3: Create bot main file**

Create `backend/src/bot/index.ts`:
```typescript
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
```

**Step 4: Start bot in main app**

Modify `backend/src/index.ts`:
```typescript
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
```

**Step 5: Commit**

Run:
```bash
git add backend/src/bot/
git commit -m "feat: implement Telegram bot with connection commands"
```

---

## Phase 7: Notification Scheduler

### Task 7.1: Create Notification Service

**Files:**
- Create: `backend/src/services/notifications.ts`

**Step 1: Install cron library**

Run: `cd backend && bun add node-cron`

**Step 2: Create notification service**

Create `backend/src/services/notifications.ts`:
```typescript
import { db } from '../db';
import { subscriptions, users, notificationLogs } from '../db/schema';
import { eq, and, sql, lte, inArray } from 'drizzle-orm';
import { sendTelegramMessage } from '../lib/telegram';

interface SubscriptionWithUser {
  subscription: typeof subscriptions.$inferSelect;
  user: typeof users.$inferSelect;
}

export async function sendSubscriptionReminders(): Promise<void> {
  console.log('🔔 Running subscription reminder check...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active subscriptions with users
    const activeSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: users,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.isActive, true),
          eq(users.isActive, true),
          sql`${users.telegramChatId} IS NOT NULL`
        )
      );

    let sentCount = 0;
    let failedCount = 0;

    for (const { subscription, user } of activeSubscriptions) {
      const renewalDate = new Date(subscription.renewalDate);
      const daysUntilRenewal = Math.ceil(
        (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send reminder for this subscription
      if (!subscription.reminderDays.includes(daysUntilRenewal)) {
        continue;
      }

      // Check if notification already sent for this day
      const existingLog = await db
        .select()
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.subscriptionId, subscription.id),
            eq(notificationLogs.daysBefore, daysUntilRenewal),
            sql`DATE(${notificationLogs.sentAt}) = DATE(${today.toISOString()})`
          )
        )
        .limit(1);

      if (existingLog.length > 0) {
        continue; // Already sent today
      }

      // Format and send message
      const message = formatReminderMessage(subscription, daysUntilRenewal);
      const success = await sendTelegramMessage(user.telegramChatId!, message);

      // Log notification
      await db.insert(notificationLogs).values({
        subscriptionId: subscription.id,
        notificationType: 'telegram',
        status: success ? 'sent' : 'failed',
        daysBefore: daysUntilRenewal,
      });

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Reminders sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (error) {
    console.error('❌ Error sending reminders:', error);
  }
}

function formatReminderMessage(
  subscription: typeof subscriptions.$inferSelect,
  daysUntilRenewal: number
): string {
  const emoji = daysUntilRenewal <= 1 ? '🚨' : daysUntilRenewal <= 3 ? '⚠️' : '🔔';

  return `${emoji} *Subscription Reminder*\n\n` +
    `📌 *Service:* ${subscription.serviceName}\n` +
    `⏰ *Renews in:* ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''}\n` +
    `💵 *Cost:* ${subscription.currency} ${subscription.cost}\n` +
    `💳 *Payment:* ${subscription.paymentMethod}\n` +
    `👤 *Account:* ${subscription.accountName}\n` +
    (subscription.notes ? `\n📝 *Notes:* ${subscription.notes}` : '');
}
```

**Step 3: Commit**

Run:
```bash
git add backend/src/services/notifications.ts
git commit -m "feat: create notification service for subscription reminders"
```

---

### Task 7.2: Setup Cron Job

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Add cron job to main app**

Modify `backend/src/index.ts`:
```typescript
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
```

**Step 2: Commit**

Run:
```bash
git add backend/src/index.ts
git commit -m "feat: add cron job scheduler for daily notifications"
```

---

## Phase 8: Frontend Setup

### Task 8.1: Initialize Frontend Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/.env.example`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`

**Step 1: Create frontend with Vite**

Run:
```bash
cd .. # Go back to root
bunx create-vite frontend --template react-ts
cd frontend
bun install
```

**Step 2: Install dependencies**

Run:
```bash
bun add react-router-dom @tanstack/react-query axios better-auth zod react-hook-form @hookform/resolvers
bun add -d @types/node
```

**Step 3: Initialize shadcn/ui**

Run:
```bash
bunx shadcn@latest init
```

Select:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 4: Install shadcn components**

Run:
```bash
bunx shadcn@latest add button card input label form toast dialog table badge select separator
```

**Step 5: Create .env.example**

Create `frontend/.env.example`:
```env
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=SubTrackBot
```

**Step 6: Update vite.config.ts**

Modify `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**Step 7: Commit**

Run:
```bash
git add frontend/
git commit -m "chore: initialize frontend with Vite, React, and shadcn/ui"
```

---

### Task 8.2: Setup API Client and Auth

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth.ts`
- Create: `frontend/src/lib/query-client.ts`

**Step 1: Create API client**

Create `frontend/src/lib/api.ts`:
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Step 2: Create auth client**

Create `frontend/src/lib/auth.ts`:
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Step 3: Create React Query client**

Create `frontend/src/lib/query-client.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
```

**Step 4: Commit**

Run:
```bash
git add frontend/src/lib/
git commit -m "feat: setup API client, auth, and React Query"
```

---

### Task 8.3: Setup Router and Layout

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/components/layout/Layout.tsx`
- Create: `frontend/src/components/layout/Navbar.tsx`

**Step 1: Create Layout component**

Create `frontend/src/components/layout/Layout.tsx`:
```typescript
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Create Navbar component**

Create `frontend/src/components/layout/Navbar.tsx`:
```typescript
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from '@/lib/auth';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          SubTrack
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              {session.user.role === 'admin' && (
                <Link to="/admin/dashboard">
                  <Button variant="ghost">Admin</Button>
                </Link>
              )}
              <Button onClick={() => signOut()} variant="outline">
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 3: Setup router in App.tsx**

Create `frontend/src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { Layout } from './components/layout/Layout';
import { useSession } from './lib/auth';

// Pages will be created in next tasks
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { SubscriptionNewPage } from './pages/SubscriptionNewPage';
import { SubscriptionEditPage } from './pages/SubscriptionEditPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session || session.user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/subscriptions/new" element={
              <ProtectedRoute>
                <SubscriptionNewPage />
              </ProtectedRoute>
            } />

            <Route path="/subscriptions/:id/edit" element={
              <ProtectedRoute>
                <SubscriptionEditPage />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            } />

            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

**Step 4: Update main.tsx**

Modify `frontend/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Commit**

Run:
```bash
git add frontend/src/
git commit -m "feat: setup router, layout, and navigation"
```

---

## Phase 9: Frontend Pages

### Task 9.1: Authentication Pages

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`

**Step 1: Create Login page**

Create `frontend/src/pages/LoginPage.tsx`:
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn.email({ email, password });
      toast({ title: 'Success', description: 'Signed in successfully' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create Register page**

Create `frontend/src/pages/RegisterPage.tsx`:
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUp.email({ name, email, password });
      toast({ title: 'Success', description: 'Account created successfully' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up to start tracking your subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

Run:
```bash
git add frontend/src/pages/
git commit -m "feat: add login and register pages"
```

---

### Task 9.2: Dashboard Page - Structure

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/hooks/useSubscriptions.ts`
- Create: `frontend/src/types/index.ts`

**Step 1: Create types**

Create `frontend/src/types/index.ts`:
```typescript
export interface Subscription {
  id: string;
  userId: string;
  serviceName: string;
  renewalDate: string;
  cost: string;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'quarterly' | 'custom';
  paymentMethod: string;
  accountName: string;
  reminderDays: number[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  totalMonthlyCost: string;
  upcomingRenewals: Subscription[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  telegramChatId?: string;
  subscriptionLimit: number;
  role: 'user' | 'admin';
}
```

**Step 2: Create subscriptions hook**

Create `frontend/src/hooks/useSubscriptions.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Subscription, SubscriptionStats } from '@/types';

export function useSubscriptions(filters?: { active?: boolean; upcoming?: boolean }) {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) params.append('active', String(filters.active));
      if (filters?.upcoming) params.append('upcoming', 'true');

      const { data } = await api.get<{ data: Subscription[] }>(
        `/api/subscriptions?${params}`
      );
      return data.data;
    },
  });
}

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SubscriptionStats }>('/api/subscriptions/stats');
      return data.data;
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
    },
  });
}
```

**Step 3: Create Dashboard page**

Create `frontend/src/pages/DashboardPage.tsx`:
```typescript
import { Link } from 'react-router-dom';
import { useSubscriptions, useSubscriptionStats } from '@/hooks/useSubscriptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

export function DashboardPage() {
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions({ active: true });
  const { data: stats, isLoading: statsLoading } = useSubscriptionStats();

  if (subsLoading || statsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link to="/subscriptions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Subscriptions</CardTitle>
            <CardDescription>Active subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalSubscriptions || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Cost</CardTitle>
            <CardDescription>Total recurring cost</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats?.totalMonthlyCost || '0.00'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Renewals</CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.upcomingRenewals?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>Manage your active subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="border p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{sub.serviceName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Renews on {new Date(sub.renewalDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{sub.currency} {sub.cost}</p>
                      <Link to={`/subscriptions/${sub.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No subscriptions yet. Add your first subscription to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

Run:
```bash
git add frontend/src/
git commit -m "feat: add dashboard page with subscription stats"
```

---

## Execution Choice

Plan complete and saved to `docs/plans/2026-01-10-subtrack-implementation.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
