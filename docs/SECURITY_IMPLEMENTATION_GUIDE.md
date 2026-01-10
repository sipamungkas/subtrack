# Security Implementation Guide - SubTrack

Step-by-step implementation guide for addressing the security findings.

---

## 1. Rate Limiting Implementation

### Install Dependencies

```bash
cd backend
bun add hono-rate-limiter
```

### Update app.ts

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
// ... other imports

const app = new Hono();

// Security headers (add this FIRST)
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  // Add HSTS when using HTTPS in production
  // strictTransportSecurity: 'max-age=31536000; includeSubDomains',
}));

// Global rate limiter
app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
}));

// Stricter rate limit for auth endpoints
app.use('/api/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
}));

// Stricter rate limit for telegram verification
app.use('/api/telegram/verify', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
}));

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ... rest of routes
```

---

## 2. Secure Verification Code Generation

### Update lib/telegram.ts

```typescript
import { randomBytes } from 'crypto';

export function generateVerificationCode(): string {
  // Generate 5 random bytes = 10 hex characters
  // This provides 40 bits of entropy (much stronger than Math.random)
  return randomBytes(5).toString('hex').toUpperCase();
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

### Update validator to match new code length

```typescript
// validators/telegram.ts
import { z } from 'zod';

export const verifyTelegramSchema = z.object({
  code: z.string().length(10), // Updated from 8 to 10 for hex format
  chatId: z.string().min(1),
});
```

---

## 3. Secure Telegram Verification Endpoint

### Add environment variable

```bash
# .env
TELEGRAM_BOT_SECRET=your-strong-random-secret-here
```

### Update routes/telegram.ts

```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { users, telegramVerifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyTelegramSchema } from '../validators/telegram';

const telegramRouter = new Hono();

// Middleware to verify bot secret
const verifyBotSecret = async (c: Context, next: Next) => {
  const botSecret = c.req.header('X-Bot-Secret');
  const expectedSecret = process.env.TELEGRAM_BOT_SECRET;

  if (!expectedSecret) {
    console.error('TELEGRAM_BOT_SECRET not configured');
    return c.json({ error: 'SERVER_ERROR' }, 500);
  }

  if (botSecret !== expectedSecret) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid bot secret' }, 401);
  }

  await next();
};

// POST /api/telegram/verify - Verify code and save chat_id (called by bot)
telegramRouter.post('/verify', verifyBotSecret, async (c) => {
  // ... rest of the handler
});

export default telegramRouter;
```

### Update bot/commands.ts to send secret

```typescript
// In handleStart function
const response = await fetch(`${process.env.BETTER_AUTH_URL}/api/telegram/verify`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Bot-Secret': process.env.TELEGRAM_BOT_SECRET || '',
  },
  body: JSON.stringify({ code, chatId }),
});
```

---

## 4. Input Validation Improvements

### Update validators/subscription.ts

```typescript
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  serviceName: z.string().min(1).max(255),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default('USD'),
  billingCycle: z.enum(['monthly', 'yearly', 'quarterly', 'custom']).default('monthly'),
  paymentMethod: z.string().min(1).max(255), // Added max length
  accountName: z.string().min(1).max(255),
  reminderDays: z.array(z.number().int().positive().max(365)).max(10).default([7, 3, 1]),
  notes: z.string().max(2000).optional(), // Added max length
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();

export const subscriptionQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  upcoming: z.enum(['true', 'false']).optional(),
});
```

---

## 5. Error Handling Improvements

### Create a utility for safe error responses

```typescript
// lib/errors.ts
import { z } from 'zod';

export function formatValidationError(error: z.ZodError) {
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
    };
  }

  return {
    error: 'VALIDATION_ERROR',
    message: error.message,
    details: error.errors,
  };
}

export function formatServerError(error: unknown) {
  console.error('Server error:', error);

  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  return {
    error: 'SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

---

## 6. Production Logging Configuration

### Update lib/auth.ts

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { db } from "../db";
import * as schema from "../db/schema";

const isProduction = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Consider adding password requirements
    // minPasswordLength: 12,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  advanced: {},
  logger: {
    level: isProduction ? "error" : "debug",
  },
});

export type Auth = typeof auth;
```

---

## 7. Database Connection Security

### Update database connection for production SSL

```typescript
// db/index.ts
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const isProduction = process.env.NODE_ENV === 'production';

export const queryClient = postgres(connectionString, {
  ssl: isProduction ? 'require' : false,
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});
```

---

## Testing Security Implementations

### Test Rate Limiting

```bash
# Test with curl (should get rate limited after 10 attempts)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/sign-in \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

### Test Security Headers

```bash
curl -I http://localhost:3000/health
# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

### Test Telegram Endpoint Security

```bash
# Without secret (should fail)
curl -X POST http://localhost:3000/api/telegram/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"TESTCODE1","chatId":"123"}'

# With secret (should work if code exists)
curl -X POST http://localhost:3000/api/telegram/verify \
  -H "Content-Type: application/json" \
  -H "X-Bot-Secret: your-secret" \
  -d '{"code":"TESTCODE1","chatId":"123"}'
```

---

## Verification Checklist

After implementing these changes, verify:

- [ ] Rate limiting blocks excessive requests
- [ ] Security headers appear in responses
- [ ] Telegram endpoint requires bot secret
- [ ] Verification codes are 10 characters (hex)
- [ ] Notes field rejects strings > 2000 chars
- [ ] Error messages are generic in production
- [ ] Debug logging is off in production
- [ ] Database uses SSL in production
