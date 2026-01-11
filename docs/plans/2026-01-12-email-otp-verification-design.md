# Email OTP Verification Design

## Overview

Implement email OTP verification for Subnudge.app using better-auth's `emailOTP` plugin. New users must verify their email immediately after signup before accessing the app. Existing unverified users will be prompted to verify on their next login.

## Requirements

- **New users**: Must verify email immediately after signup via OTP
- **Existing unverified users**: Shown blocking prompt to verify before accessing app
- **OTP settings**: 6 digits, 5-minute expiry
- **Resend limits**: 3 attempts with 60s cooldown each, then 15-minute cooldown
- **Rate limiting**: Redis-backed via better-auth's customStorage

## Backend Changes

### 1. Redis Client Setup

Add Redis client for rate limiting storage.

**File**: `backend/src/lib/redis.ts` (new)

```ts
import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL);
```

### 2. Better-Auth Configuration

**File**: `backend/src/lib/auth.ts`

Add `emailOTP` plugin and Redis-backed rate limiting:

```ts
import { emailOTP } from 'better-auth/plugins';
import { redis } from './redis';
import { sendOTPEmail } from './email';

export const auth = betterAuth({
  // ... existing config

  rateLimit: {
    customStorage: {
      get: async (key) => {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      },
      set: async (key, value, ttl) => {
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
      },
    },
  },

  plugins: [
    // ... existing plugins
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      sendVerificationOTP: async ({ email, otp }) => {
        await sendOTPEmail(email, otp);
      },
    }),
  ],
});
```

### 3. OTP Email Template

**File**: `backend/src/lib/email.ts`

Add OTP email function:

```ts
export function getOTPEmailHtml(otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Reuse existing email styles */
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Verify your email</h1>
        <p>Your verification code for Subnudge.app is:</p>
        <div class="otp-code">${otp}</div>
        <p>This code expires in 5 minutes.</p>
        <p class="footer">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your verification code for Subnudge.app',
    html: getOTPEmailHtml(otp),
  });
}
```

### 4. OTP Resend Rate Limiting

**File**: `backend/src/lib/otp-rate-limit.ts` (new)

```ts
import { redis } from './redis';

const MAX_RESENDS = 3;
const SHORT_COOLDOWN = 60; // seconds
const LONG_COOLDOWN = 900; // 15 minutes

interface ResendState {
  count: number;
  lastAttempt: number;
}

export async function canResendOTP(email: string): Promise<{
  allowed: boolean;
  waitSeconds?: number;
  attemptsLeft?: number;
}> {
  const key = `otp-resend:${email}`;
  const raw = await redis.get(key);
  const state: ResendState = raw ? JSON.parse(raw) : { count: 0, lastAttempt: 0 };

  const now = Date.now();
  const elapsed = (now - state.lastAttempt) / 1000;

  // Check if in long cooldown (after 3 attempts)
  if (state.count >= MAX_RESENDS) {
    if (elapsed < LONG_COOLDOWN) {
      return { allowed: false, waitSeconds: Math.ceil(LONG_COOLDOWN - elapsed) };
    }
    // Reset after long cooldown
    await redis.del(key);
    return { allowed: true, attemptsLeft: MAX_RESENDS };
  }

  // Check short cooldown between attempts
  if (state.count > 0 && elapsed < SHORT_COOLDOWN) {
    return {
      allowed: false,
      waitSeconds: Math.ceil(SHORT_COOLDOWN - elapsed),
      attemptsLeft: MAX_RESENDS - state.count,
    };
  }

  return { allowed: true, attemptsLeft: MAX_RESENDS - state.count };
}

export async function recordResendAttempt(email: string): Promise<void> {
  const key = `otp-resend:${email}`;
  const raw = await redis.get(key);
  const state: ResendState = raw ? JSON.parse(raw) : { count: 0, lastAttempt: 0 };

  state.count += 1;
  state.lastAttempt = Date.now();

  // Set TTL to long cooldown duration
  await redis.set(key, JSON.stringify(state), 'EX', LONG_COOLDOWN);
}

export async function clearResendLimit(email: string): Promise<void> {
  await redis.del(`otp-resend:${email}`);
}
```

### 5. Resend Endpoint

**File**: `backend/src/routes/auth.ts`

Add endpoint to check resend status:

```ts
app.get('/api/auth/otp-resend-status', async (c) => {
  const email = c.req.query('email');
  if (!email) return c.json({ error: 'Email required' }, 400);

  const status = await canResendOTP(email);
  return c.json(status);
});
```

## Frontend Changes

### 1. Auth Client Configuration

**File**: `frontend/src/lib/auth.tsx`

Add emailOTP client plugin:

```ts
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // ... existing config
  plugins: [
    emailOTPClient(),
  ],
});
```

### 2. Verify Email Page

**File**: `frontend/src/pages/VerifyEmailPage.tsx` (new)

```tsx
// OTP input with 6 digit fields
// Resend button with countdown timer
// Shows attempts remaining
// After 3 attempts: "Try again in X minutes"
// On success: redirect to dashboard
```

### 3. Email Verification Blocker

**File**: `frontend/src/components/EmailVerificationBlocker.tsx` (new)

```tsx
// Full-screen overlay for unverified users
// "Please verify your email to continue"
// "Send Verification Code" button
// Redirects to /verify-email on click
```

### 4. Route Protection Update

**File**: `frontend/src/lib/auth.tsx`

Update auth context to:
- Check `emailVerified` status on session load
- Expose `isEmailVerified` boolean
- Provide `requiresEmailVerification` flag

### 5. Register Page Update

**File**: `frontend/src/pages/RegisterPage.tsx`

After successful signup:
- Auto-trigger OTP send (handled by backend)
- Redirect to `/verify-email?email={email}`

### 6. Router Update

**File**: `frontend/src/App.tsx`

Add route:
```tsx
<Route path="/verify-email" element={<VerifyEmailPage />} />
```

## User Flows

### New User Signup
1. User fills signup form → submits
2. Backend creates user → sends OTP email
3. Frontend redirects to `/verify-email?email=...`
4. User enters OTP → verified
5. Redirect to dashboard

### Existing Unverified User Login
1. User logs in successfully
2. App detects `emailVerified: false`
3. Shows `EmailVerificationBlocker` overlay
4. User clicks "Send Verification Code"
5. Redirects to `/verify-email`
6. User enters OTP → verified
7. Blocker removed, access granted

### OTP Resend Flow
1. User on `/verify-email` clicks "Resend"
2. Frontend checks `/api/auth/otp-resend-status`
3. If allowed: sends OTP, starts 60s countdown
4. If cooldown: shows remaining wait time
5. After 3 attempts: shows "Try again in X minutes"

## Dependencies

- `ioredis` — Redis client for Bun/Node (add to backend)
- `better-auth/plugins` — emailOTP plugin (included in better-auth)
- `better-auth/client/plugins` — emailOTPClient (included in better-auth)

## Environment Variables

```env
REDIS_URL=redis://localhost:6379
```

## File Summary

| File | Action |
|------|--------|
| `backend/src/lib/redis.ts` | Create |
| `backend/src/lib/auth.ts` | Modify |
| `backend/src/lib/email.ts` | Modify |
| `backend/src/lib/otp-rate-limit.ts` | Create |
| `backend/src/routes/auth.ts` | Modify |
| `frontend/src/lib/auth.tsx` | Modify |
| `frontend/src/pages/VerifyEmailPage.tsx` | Create |
| `frontend/src/components/EmailVerificationBlocker.tsx` | Create |
| `frontend/src/pages/RegisterPage.tsx` | Modify |
| `frontend/src/App.tsx` | Modify |
