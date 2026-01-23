import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { captcha, emailOTP } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendEmail, getPasswordResetEmailHtml, sendOTPEmail } from "./email";
import { redis } from "./redis";

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
        const success = await sendOTPEmail(email, otp, type);
        if (!success) {
          console.error(`Failed to send OTP email to ${email} for ${type}`);
        }
      },
    }),
  ],
  logger: {
    level: isProduction ? "error" : "debug",
  },
});

export type Auth = typeof auth;
