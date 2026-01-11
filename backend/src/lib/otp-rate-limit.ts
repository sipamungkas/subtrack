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

  let raw: string | null = null;
  try {
    raw = await redis.get(key);
  } catch (error) {
    console.error("Redis error in canResendOTP:", error);
    // Fail open: allow request when Redis is unavailable
    return { allowed: true, attemptsLeft: MAX_RESENDS };
  }

  let state: ResendState = { count: 0, lastAttempt: 0 };
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch (error) {
      console.error("JSON parse error in canResendOTP:", error);
      // Reset to default state if data is corrupted
      state = { count: 0, lastAttempt: 0 };
    }
  }

  const now = Date.now();
  const elapsed = (now - state.lastAttempt) / 1000;

  // Check if in long cooldown (after 3 attempts)
  if (state.count >= MAX_RESENDS) {
    if (elapsed < LONG_COOLDOWN) {
      return { allowed: false, waitSeconds: Math.ceil(LONG_COOLDOWN - elapsed) };
    }
    // Reset after long cooldown
    try {
      await redis.del(key);
    } catch (error) {
      console.error("Redis error clearing key in canResendOTP:", error);
      // Continue anyway - we can still allow the request
    }
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

  let raw: string | null = null;
  try {
    raw = await redis.get(key);
  } catch (error) {
    console.error("Redis error in recordResendAttempt (get):", error);
    // Fail open: skip recording if Redis is unavailable
    return;
  }

  let state: ResendState = { count: 0, lastAttempt: 0 };
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch (error) {
      console.error("JSON parse error in recordResendAttempt:", error);
      // Reset to default state if data is corrupted
      state = { count: 0, lastAttempt: 0 };
    }
  }

  state.count += 1;
  state.lastAttempt = Date.now();

  try {
    await redis.set(key, JSON.stringify(state), "EX", LONG_COOLDOWN);
  } catch (error) {
    console.error("Redis error in recordResendAttempt (set):", error);
    // Fail open: skip recording if Redis is unavailable
  }
}

export async function clearResendLimit(email: string): Promise<void> {
  try {
    await redis.del(`otp-resend:${email}`);
  } catch (error) {
    console.error("Redis error in clearResendLimit:", error);
    // Fail open: ignore errors when clearing limits
  }
}
