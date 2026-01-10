# Security Audit Report - SubTrack

**Date:** 2026-01-10
**Application:** SubTrack - Subscription Tracking Application
**Auditor:** Automated Security Audit
**Severity Levels:** Critical | High | Medium | Low | Informational

---

## Executive Summary

SubTrack is a subscription tracking application with a **Bun/Hono backend** and a **React/Vite frontend**, featuring Telegram integration for notifications. The application uses **Better-Auth** for authentication and **Drizzle ORM** with PostgreSQL.

### Overall Assessment

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | Good | Better-Auth with session-based auth |
| Authorization | Good | Role-based access control implemented |
| Input Validation | Good | Zod schemas used consistently |
| SQL Injection | Good | Drizzle ORM provides parameterized queries |
| XSS Prevention | Good | React's default escaping, no dangerouslySetInnerHTML |
| CSRF Protection | Good | Cookie-based auth with credentials, CORS configured |
| Security Headers | **Needs Improvement** | Missing security headers |
| Rate Limiting | **Needs Improvement** | No rate limiting implemented |
| Dependencies | **Unknown** | Cannot verify without lockfiles |

### Risk Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 3 |
| Informational | 3 |

---

## Detailed Findings

### HIGH SEVERITY

#### 1. [HIGH] Missing Rate Limiting

**Location:** All API endpoints
**Description:** The application lacks rate limiting on all endpoints, including authentication endpoints. This makes the application vulnerable to:
- Brute force attacks on login
- Denial of service attacks
- API abuse

**Affected Files:**
- `backend/src/app.ts`
- `backend/src/routes/auth.ts`

**Recommendation:**
```typescript
// Install hono rate limiter
// npm install hono-rate-limiter

import { rateLimiter } from 'hono-rate-limiter';

// Apply to all routes
app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));

// Stricter limit for auth endpoints
app.use('/api/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 minutes
}));
```

---

#### 2. [HIGH] Missing Security Headers

**Location:** `backend/src/app.ts`
**Description:** The application does not set security headers such as:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `Referrer-Policy`

**Recommendation:**
```typescript
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));
```

---

### MEDIUM SEVERITY

#### 3. [MEDIUM] Telegram Verification Endpoint Publicly Accessible

**Location:** `backend/src/routes/telegram.ts:10`
**Description:** The `/api/telegram/verify` endpoint is publicly accessible without authentication. While it requires a valid verification code, this could be exploited for enumeration attacks.

**Current Code:**
```typescript
telegramRouter.post('/verify', async (c) => {
  // No authentication required
});
```

**Recommendation:**
Consider adding a shared secret between the bot and the API, or implement IP whitelisting for internal communication:
```typescript
const BOT_SECRET = process.env.TELEGRAM_BOT_SECRET;

telegramRouter.post('/verify', async (c) => {
  const authHeader = c.req.header('X-Bot-Secret');
  if (authHeader !== BOT_SECRET) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }
  // ... rest of the code
});
```

---

#### 4. [MEDIUM] Weak Verification Code Generation

**Location:** `backend/src/lib/telegram.ts:1-8`
**Description:** The verification code generator uses `Math.random()`, which is not cryptographically secure.

**Current Code:**
```typescript
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Recommendation:**
```typescript
import { randomBytes } from 'crypto';

export function generateVerificationCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}
```

---

#### 5. [MEDIUM] No Account Lockout Mechanism

**Location:** Authentication system
**Description:** There is no mechanism to lock accounts after repeated failed login attempts. Combined with missing rate limiting, this makes brute force attacks easier.

**Recommendation:** Implement account lockout after 5-10 failed attempts with exponential backoff, or use Better-Auth's built-in rate limiting if available.

---

#### 6. [MEDIUM] API Key Exposure in URL

**Location:** `backend/src/services/currency.ts:32`
**Description:** The Fixer API key is passed as a URL query parameter, which may be logged in server logs or third-party analytics.

**Current Code:**
```typescript
const url = `http://data.fixer.io/api/latest?access_key=${apiKey}`;
```

**Note:** This is a limitation of the Fixer.io free tier API. Consider upgrading to a paid tier that supports header-based authentication, or use a different currency API that supports secure authentication.

---

### LOW SEVERITY

#### 7. [LOW] Missing Input Sanitization for Notes Field

**Location:** `backend/src/validators/subscription.ts:12`
**Description:** The `notes` field in subscription has no length limit and minimal validation.

**Current Code:**
```typescript
notes: z.string().optional(),
```

**Recommendation:**
```typescript
notes: z.string().max(2000).optional(),
```

---

#### 8. [LOW] Verbose Error Messages

**Location:** Various route handlers
**Description:** Some error messages expose internal implementation details. While Zod error messages are being passed through, they should be sanitized before sending to clients in production.

**Example:** `backend/src/routes/subscriptions.ts:167-170`
```typescript
return c.json({
  error: 'VALIDATION_ERROR',
  message: validation.error.message,
  details: validation.error.errors, // Exposes internal validation structure
}, 400);
```

**Recommendation:** In production, return generic error messages and log detailed errors server-side.

---

#### 9. [LOW] No Password Strength Requirements

**Location:** Better-Auth configuration (`backend/src/lib/auth.ts`)
**Description:** The authentication configuration doesn't enforce password strength requirements beyond Better-Auth defaults.

**Recommendation:** Configure Better-Auth with password policies:
```typescript
emailAndPassword: {
  enabled: true,
  minPasswordLength: 12,
  requireNumbers: true,
  requireSpecialChars: true,
}
```

---

### INFORMATIONAL

#### 10. [INFO] HTTP Used for Fixer API

**Location:** `backend/src/services/currency.ts:32`
**Description:** The Fixer.io API is called over HTTP instead of HTTPS. This is a limitation of the free tier.

**Current Code:**
```typescript
const url = `http://data.fixer.io/api/latest?access_key=${apiKey}`;
```

**Note:** Consider upgrading to a paid tier or using a different API that supports HTTPS on the free tier.

---

#### 11. [INFO] Debug Logging Enabled

**Location:** `backend/src/lib/auth.ts:20-22`
**Description:** Debug logging is enabled for Better-Auth, which may expose sensitive information in production logs.

```typescript
logger: {
  level: "debug",
}
```

**Recommendation:** Set log level based on environment:
```typescript
logger: {
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
}
```

---

#### 12. [INFO] Environment File Security

**Location:** `.env.example` files
**Description:** Example environment files exist with placeholder values. Ensure actual `.env` files are in `.gitignore` and use strong, unique values in production.

**Checklist:**
- [ ] Actual `.env` files are in `.gitignore`
- [ ] `BETTER_AUTH_SECRET` is a strong random string (32+ characters)
- [ ] `TELEGRAM_BOT_TOKEN` is kept confidential
- [ ] `DATABASE_URL` uses SSL in production
- [ ] All secrets are rotated periodically

---

## Positive Security Findings

### Authentication & Authorization
- **Better-Auth Implementation:** Properly configured with database-backed sessions
- **Role-Based Access Control:** Admin routes protected with `requireAdmin` middleware
- **Session Management:** Secure cookie-based authentication with `credentials: true`

### Input Validation
- **Zod Schemas:** All API endpoints validate input using Zod
- **Type Safety:** TypeScript provides compile-time type checking
- **UUID Validation:** Resource IDs use UUID format, reducing enumeration attacks

### Database Security
- **Drizzle ORM:** Parameterized queries prevent SQL injection
- **Proper Constraints:** Foreign keys with `onDelete: cascade`
- **Data Isolation:** User data properly scoped by `userId`

### Frontend Security
- **No XSS Vectors:** No use of `dangerouslySetInnerHTML`
- **No Client-Side Storage of Tokens:** Uses HTTP-only cookies
- **No Hardcoded Secrets:** Uses environment variables

### CORS Configuration
- **Origin Restriction:** CORS configured with specific frontend origin
- **Credentials Support:** Properly configured for cookie-based auth

---

## Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Add Rate Limiting | Low | High |
| 2 | Add Security Headers | Low | High |
| 3 | Secure Verification Code Generation | Low | Medium |
| 4 | Secure Telegram Verification Endpoint | Medium | Medium |
| 5 | Add Account Lockout | Medium | Medium |
| 6 | Add Notes Field Length Limit | Low | Low |
| 7 | Environment-based Logging | Low | Low |

---

## Next Steps

1. **Immediate (This Week):**
   - Implement rate limiting
   - Add security headers
   - Fix verification code generation

2. **Short Term (This Month):**
   - Secure Telegram verification endpoint
   - Implement account lockout
   - Review and sanitize error messages

3. **Ongoing:**
   - Set up dependency vulnerability scanning (Snyk, npm audit)
   - Regular security reviews
   - Penetration testing before production deployment
