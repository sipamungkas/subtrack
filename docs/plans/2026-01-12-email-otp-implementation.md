# Email OTP Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement email OTP verification for Subnudge.app where new users must verify their email immediately after signup, and existing unverified users are prompted to verify before accessing the app.

**Architecture:** Use better-auth's emailOTP plugin with Redis-backed rate limiting. Frontend redirects to `/verify-email` page after signup. Unverified existing users see a blocking overlay.

**Tech Stack:** better-auth emailOTP plugin, ioredis, Hono, React, TypeScript

---

## Task 1: Install Redis Client

**Files:**
- Modify: `backend/package.json`

**Step 1: Install ioredis**

Run:
```bash
cd backend && bun add ioredis && bun add -d @types/ioredis
```

**Step 2: Verify installation**

Run:
```bash
cd backend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/package.json backend/bun.lockb
git commit -m "chore(backend): add ioredis for Redis-backed rate limiting"
```

---

## Task 2: Create Redis Client Module

**Files:**
- Create: `backend/src/lib/redis.ts`

**Step 1: Create Redis client**

```typescript
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
```

**Step 2: Test Redis connection manually**

Run:
```bash
cd backend && bun run dev
```
Expected: See "Redis connected" in logs (requires Redis running locally)

**Step 3: Commit**

```bash
git add backend/src/lib/redis.ts
git commit -m "feat(backend): add Redis client module"
```

---

## Task 3: Create OTP Rate Limiting Module

**Files:**
- Create: `backend/src/lib/otp-rate-limit.ts`
- Create: `backend/src/lib/__tests__/otp-rate-limit.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { canResendOTP, recordResendAttempt, clearResendLimit } from "../otp-rate-limit";
import { redis } from "../redis";

vi.mock("../redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

describe("OTP Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canResendOTP", () => {
    it("allows first attempt", async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
    });

    it("blocks during short cooldown", async () => {
      const state = {
        count: 1,
        lastAttempt: Date.now() - 30000, // 30 seconds ago
      };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBeGreaterThan(0);
      expect(result.waitSeconds).toBeLessThanOrEqual(30);
    });

    it("allows after short cooldown expires", async () => {
      const state = {
        count: 1,
        lastAttempt: Date.now() - 61000, // 61 seconds ago
      };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(2);
    });

    it("enforces long cooldown after 3 attempts", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 60000, // 1 minute ago
      };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(false);
      expect(result.waitSeconds).toBeGreaterThan(800); // ~14 min remaining
    });

    it("resets after long cooldown expires", async () => {
      const state = {
        count: 3,
        lastAttempt: Date.now() - 901000, // 15+ minutes ago
      };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(state));

      const result = await canResendOTP("test@example.com");

      expect(result.allowed).toBe(true);
      expect(result.attemptsLeft).toBe(3);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe("recordResendAttempt", () => {
    it("increments attempt count", async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      await recordResendAttempt("test@example.com");

      expect(redis.set).toHaveBeenCalledWith(
        "otp-resend:test@example.com",
        expect.stringContaining('"count":1'),
        "EX",
        900
      );
    });
  });

  describe("clearResendLimit", () => {
    it("deletes the rate limit key", async () => {
      await clearResendLimit("test@example.com");

      expect(redis.del).toHaveBeenCalledWith("otp-resend:test@example.com");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd backend && bun test src/lib/__tests__/otp-rate-limit.test.ts
```
Expected: FAIL with module not found

**Step 3: Write minimal implementation**

```typescript
import { redis } from "./redis";

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
  const state: ResendState = raw
    ? JSON.parse(raw)
    : { count: 0, lastAttempt: 0 };

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
  const state: ResendState = raw
    ? JSON.parse(raw)
    : { count: 0, lastAttempt: 0 };

  state.count += 1;
  state.lastAttempt = Date.now();

  await redis.set(key, JSON.stringify(state), "EX", LONG_COOLDOWN);
}

export async function clearResendLimit(email: string): Promise<void> {
  await redis.del(`otp-resend:${email}`);
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd backend && bun test src/lib/__tests__/otp-rate-limit.test.ts
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add backend/src/lib/otp-rate-limit.ts backend/src/lib/__tests__/otp-rate-limit.test.ts
git commit -m "feat(backend): add OTP resend rate limiting with tests"
```

---

## Task 4: Add OTP Email Template

**Files:**
- Modify: `backend/src/lib/email.ts`

**Step 1: Add OTP email template function**

Add after the existing `getPasswordResetEmailHtml` function:

```typescript
export function getOTPEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Your verification code for Subnudge.app is:
              </p>
            </td>
          </tr>
          <!-- OTP Code -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; text-align: center;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </td>
          </tr>
          <!-- Expiry notice -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                This code expires in 5 minutes.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                &copy; ${new Date().getFullYear()} Subnudge. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Your verification code for Subnudge.app",
    text: `Your verification code is: ${otp}. This code expires in 5 minutes.`,
    html: getOTPEmailHtml(otp),
  });
}
```

**Step 2: Verify build succeeds**

Run:
```bash
cd backend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/src/lib/email.ts
git commit -m "feat(backend): add OTP email template"
```

---

## Task 5: Configure better-auth emailOTP Plugin

**Files:**
- Modify: `backend/src/lib/auth.ts`

**Step 1: Add emailOTP plugin configuration**

Update the auth.ts file:

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { captcha, emailOTP } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendEmail, getPasswordResetEmailHtml, sendOTPEmail } from "./email";
import { redis } from "./redis";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password - Subnudge",
        text: `Click the link to reset your password: ${url}`,
        html: getPasswordResetEmailHtml(url),
      });
    },
  },
  rateLimit: {
    customStorage: {
      get: async (key) => {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      },
      set: async (key, value, ttl) => {
        if (ttl) {
          await redis.set(key, JSON.stringify(value), "EX", ttl);
        } else {
          await redis.set(key, JSON.stringify(value));
        }
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      endpoints: ["/sign-in/email", "/sign-up/email", "/request-password-reset"],
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOTP: async ({ email, otp, type }) => {
        console.log(`Sending OTP to ${email} for ${type}`);
        await sendOTPEmail(email, otp);
      },
    }),
  ],
  logger: {
    level: isProduction ? "error" : "debug",
  },
});

export type Auth = typeof auth;
```

**Step 2: Verify build succeeds**

Run:
```bash
cd backend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/src/lib/auth.ts
git commit -m "feat(backend): configure emailOTP plugin with Redis rate limiting"
```

---

## Task 6: Add OTP Resend Status Endpoint

**Files:**
- Modify: `backend/src/routes/auth.ts`

**Step 1: Add resend status endpoint**

```typescript
import { Hono } from "hono";
import { auth } from "../lib/auth";
import { canResendOTP, recordResendAttempt } from "../lib/otp-rate-limit";

const authRouter = new Hono();

// OTP resend status check
authRouter.get("/otp-resend-status", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return c.json({ error: "Email required" }, 400);
  }

  const status = await canResendOTP(email);
  return c.json(status);
});

// Record resend attempt (called after sending OTP)
authRouter.post("/otp-resend-record", async (c) => {
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: "Email required" }, 400);
  }

  await recordResendAttempt(email);
  return c.json({ success: true });
});

// Better-auth handles all other auth routes
authRouter.on(["POST", "GET"], "/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRouter;
```

**Step 2: Verify build succeeds**

Run:
```bash
cd backend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat(backend): add OTP resend status endpoints"
```

---

## Task 7: Update Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Add emailVerified to UserProfile**

```typescript
export interface UserProfile {
  id: string
  email: string
  name?: string
  telegramChatId?: string
  subscriptionLimit: number
  role: 'user' | 'admin'
  emailVerified: boolean
}
```

**Step 2: Add OTP related types**

```typescript
export interface OTPResendStatus {
  allowed: boolean
  waitSeconds?: number
  attemptsLeft?: number
}
```

**Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(frontend): add emailVerified and OTP types"
```

---

## Task 8: Update Auth Context

**Files:**
- Modify: `frontend/src/lib/auth.tsx`

**Step 1: Add emailVerified tracking and OTP methods**

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { queryClient } from './query-client'
import type { UserProfile, OTPResendStatus } from '@/types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isEmailVerified: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>
  signUp: (name: string, email: string, password: string, captchaToken?: string) => Promise<{ email: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  sendVerificationOTP: (email: string) => Promise<void>
  verifyEmail: (email: string, otp: string) => Promise<void>
  checkResendStatus: (email: string) => Promise<OTPResendStatus>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/user/profile')
      setUser(response.data.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.get('/api/auth/get-session')
        if (response.data?.session) {
          await refreshUser()
        }
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [refreshUser])

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const headers: Record<string, string> = {}
    if (captchaToken) {
      headers['x-captcha-response'] = captchaToken
    }

    const response = await api.post('/api/auth/sign-in/email', {
      email,
      password,
    }, { headers })

    if (response.data) {
      await refreshUser()
    }
  }

  const signUp = async (name: string, email: string, password: string, captchaToken?: string) => {
    const headers: Record<string, string> = {}
    if (captchaToken) {
      headers['x-captcha-response'] = captchaToken
    }

    await api.post('/api/auth/sign-up/email', {
      name,
      email,
      password,
    }, { headers })

    // Don't refresh user - redirect to verify email page instead
    return { email }
  }

  const signOut = async () => {
    try {
      await api.post('/api/auth/sign-out')
    } finally {
      setUser(null)
      queryClient.clear()
    }
  }

  const sendVerificationOTP = async (email: string) => {
    await api.post('/api/auth/email-otp/send-verification-otp', {
      email,
      type: 'email-verification',
    })
    // Record the resend attempt for rate limiting
    await api.post('/api/auth/otp-resend-record', { email })
  }

  const verifyEmail = async (email: string, otp: string) => {
    await api.post('/api/auth/email-otp/verify-email', {
      email,
      otp,
    })
    await refreshUser()
  }

  const checkResendStatus = async (email: string): Promise<OTPResendStatus> => {
    const response = await api.get(`/api/auth/otp-resend-status?email=${encodeURIComponent(email)}`)
    return response.data
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isEmailVerified: user?.emailVerified ?? false,
        signIn,
        signUp,
        signOut,
        refreshUser,
        sendVerificationOTP,
        verifyEmail,
        checkResendStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**Step 2: Verify build succeeds**

Run:
```bash
cd frontend && bun run build
```
Expected: Build succeeds (may have type errors to fix in other files)

**Step 3: Commit**

```bash
git add frontend/src/lib/auth.tsx
git commit -m "feat(frontend): add email verification methods to auth context"
```

---

## Task 9: Create Verify Email Page

**Files:**
- Create: `frontend/src/pages/VerifyEmailPage.tsx`

**Step 1: Create the verification page**

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw } from "lucide-react";

export function VerifyEmailPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | undefined>(3);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const { verifyEmail, sendVerificationOTP, checkResendStatus, isEmailVerified } = useAuth();

  // Redirect if already verified
  useEffect(() => {
    if (isEmailVerified) {
      navigate("/dashboard");
    }
  }, [isEmailVerified, navigate]);

  // Check resend status on mount
  useEffect(() => {
    if (email) {
      checkResendStatus(email).then((status) => {
        if (!status.allowed && status.waitSeconds) {
          setCooldown(status.waitSeconds);
        }
        setAttemptsLeft(status.attemptsLeft);
      });
    }
  }, [email, checkResendStatus]);

  // Countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email, code);
      toast({ title: "Email Verified!", description: "Welcome to Subnudge" });
      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Verification Failed",
        description: err.response?.data?.message || "Invalid or expired code",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const status = await checkResendStatus(email);
      if (!status.allowed) {
        setCooldown(status.waitSeconds || 60);
        setAttemptsLeft(status.attemptsLeft);
        toast({
          title: "Please Wait",
          description: `You can resend in ${status.waitSeconds} seconds`,
          variant: "destructive",
        });
        return;
      }

      await sendVerificationOTP(email);
      setCooldown(60);
      setAttemptsLeft((status.attemptsLeft || 3) - 1);
      toast({ title: "Code Sent", description: "Check your email for the new code" });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Failed to Resend",
        description: err.response?.data?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!email) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Invalid verification link. Please try signing up again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Enter Verification Code</CardTitle>
            <CardDescription>
              The code expires in 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-mono bg-background/50"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={isLoading || otp.join("").length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            {/* Resend Section */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              {cooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Resend available in <span className="font-medium text-foreground">{formatCooldown(cooldown)}</span>
                </p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={isResending || attemptsLeft === 0}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Code
                    </>
                  )}
                </Button>
              )}
              {attemptsLeft !== undefined && attemptsLeft < 3 && (
                <p className="text-xs text-muted-foreground">
                  {attemptsLeft > 0
                    ? `${attemptsLeft} resend${attemptsLeft > 1 ? "s" : ""} remaining`
                    : "No more resends. Please wait 15 minutes."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Verify build succeeds**

Run:
```bash
cd frontend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/VerifyEmailPage.tsx
git commit -m "feat(frontend): add email verification page with OTP input"
```

---

## Task 10: Create Email Verification Blocker Component

**Files:**
- Create: `frontend/src/components/EmailVerificationBlocker.tsx`

**Step 1: Create the blocker component**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, ShieldAlert } from "lucide-react";

export function EmailVerificationBlocker() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, sendVerificationOTP } = useAuth();

  if (!user) return null;

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      await sendVerificationOTP(user.email);
      toast({ title: "Code Sent", description: "Check your email for the verification code" });
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-warning/10 rounded-full">
              <ShieldAlert className="h-8 w-8 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-base">
            To continue using Subnudge, please verify your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{user.email}</span>
          </div>

          <Button onClick={handleSendCode} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending Code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            A 6-digit code will be sent to your email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/EmailVerificationBlocker.tsx
git commit -m "feat(frontend): add email verification blocker component"
```

---

## Task 11: Update App Router and Routes

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add verify-email route and update ProtectedRoute**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider, useAuth } from './lib/auth'
import { Layout } from './components/layout/Layout'
import { EmailVerificationBlocker } from './components/EmailVerificationBlocker'

// Pages
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { SubscriptionNewPage } from './pages/SubscriptionNewPage'
import { SubscriptionEditPage } from './pages/SubscriptionEditPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isEmailVerified } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  // Show blocker for unverified users
  if (!isEmailVerified) {
    return (
      <>
        {children}
        <EmailVerificationBlocker />
      </>
    )
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, isEmailVerified } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" />
  }

  // Show blocker for unverified admins
  if (!isEmailVerified) {
    return (
      <>
        {children}
        <EmailVerificationBlocker />
      </>
    )
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />
  }

  return <>{children}</>
}

// Route for verify-email that requires auth but not verification
function VerifyEmailRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isEmailVerified } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Allow unauthenticated access (for signup flow)
  // Redirect verified users to dashboard
  if (isAuthenticated && isEmailVerified) {
    return <Navigate to="/dashboard" />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Email verification route */}
        <Route
          path="/verify-email"
          element={
            <VerifyEmailRoute>
              <VerifyEmailPage />
            </VerifyEmailRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions/new"
          element={
            <ProtectedRoute>
              <SubscriptionNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions/:id/edit"
          element={
            <ProtectedRoute>
              <SubscriptionEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

**Step 2: Verify build succeeds**

Run:
```bash
cd frontend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): add verify-email route and email verification blocking"
```

---

## Task 12: Update Register Page

**Files:**
- Modify: `frontend/src/pages/RegisterPage.tsx`

**Step 1: Update to redirect to verify-email after signup**

In the `handleSubmit` function, change:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!captchaToken) {
    toast({
      title: "Verification Required",
      description: "Please complete the security check",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    const { email: userEmail } = await signUp(name, email, password, captchaToken);
    toast({ title: "Account Created!", description: "Please verify your email to continue" });
    navigate(`/verify-email?email=${encodeURIComponent(userEmail)}`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    toast({
      title: "Error",
      description: err.response?.data?.message || "Failed to create account",
      variant: "destructive",
    });
    setCaptchaToken(null);
  } finally {
    setIsLoading(false);
  }
};
```

**Step 2: Verify build succeeds**

Run:
```bash
cd frontend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx
git commit -m "feat(frontend): redirect to verify-email after signup"
```

---

## Task 13: Update Backend User Profile Endpoint

**Files:**
- Check and modify if needed: `backend/src/routes/user.ts`

**Step 1: Ensure emailVerified is included in profile response**

Find the user profile endpoint and ensure it returns `emailVerified` from the session/user data.

```typescript
// In the profile endpoint, ensure we return emailVerified
const profile = {
  id: user.id,
  email: user.email,
  name: user.name,
  telegramChatId: user.telegramChatId,
  subscriptionLimit: user.subscriptionLimit,
  role: user.role,
  emailVerified: user.emailVerified ?? false,
};
```

**Step 2: Verify build succeeds**

Run:
```bash
cd backend && bun run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add backend/src/routes/user.ts
git commit -m "feat(backend): include emailVerified in user profile response"
```

---

## Task 14: Add REDIS_URL to Environment

**Files:**
- Modify: `backend/.env.example` (if exists)

**Step 1: Document the required environment variable**

Add to .env.example or document:
```
REDIS_URL=redis://localhost:6379
```

**Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs(backend): add REDIS_URL to environment variables"
```

---

## Task 15: End-to-End Testing

**Step 1: Start Redis locally**

```bash
docker run -d -p 6379:6379 redis:alpine
```
Or use your preferred Redis setup.

**Step 2: Start backend**

```bash
cd backend && bun run dev
```

**Step 3: Start frontend**

```bash
cd frontend && bun run dev
```

**Step 4: Test new user signup flow**

1. Go to `/register`
2. Fill in name, email, password
3. Complete CAPTCHA
4. Click "Create Account"
5. Should redirect to `/verify-email?email=...`
6. Check email (or console in dev) for OTP
7. Enter OTP
8. Should redirect to dashboard

**Step 5: Test existing unverified user**

1. Log in with an existing unverified user
2. Should see blocker overlay
3. Click "Send Verification Code"
4. Should redirect to `/verify-email`
5. Complete verification

**Step 6: Test resend rate limiting**

1. On verify-email page, click "Resend Code"
2. Should show 60s cooldown
3. After cooldown, resend again (repeat 3 times)
4. After 3rd resend, should show 15-minute cooldown

**Step 7: Commit final changes if any**

```bash
git add .
git commit -m "test: verify email OTP flow works end-to-end"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install Redis client | package.json |
| 2 | Create Redis module | redis.ts |
| 3 | OTP rate limiting | otp-rate-limit.ts + tests |
| 4 | OTP email template | email.ts |
| 5 | Configure emailOTP plugin | auth.ts |
| 6 | Resend status endpoint | routes/auth.ts |
| 7 | Update frontend types | types/index.ts |
| 8 | Update auth context | auth.tsx |
| 9 | Verify email page | VerifyEmailPage.tsx |
| 10 | Verification blocker | EmailVerificationBlocker.tsx |
| 11 | Update router | App.tsx |
| 12 | Update register page | RegisterPage.tsx |
| 13 | Update profile endpoint | routes/user.ts |
| 14 | Environment docs | .env.example |
| 15 | E2E testing | Manual testing |
