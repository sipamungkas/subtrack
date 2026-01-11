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
