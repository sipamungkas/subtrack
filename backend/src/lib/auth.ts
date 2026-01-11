import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { captcha } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendEmail, getPasswordResetEmailHtml } from "./email";

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
    sendResetPassword: async ({ user, url }) => {
      // Use void to avoid awaiting (prevents timing attacks)
      void sendEmail({
        to: user.email,
        subject: "Reset your password - Subnudge",
        text: `Click the link to reset your password: ${url}`,
        html: getPasswordResetEmailHtml(url),
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      endpoints: [
        "/sign-in/email",
        "/sign-up/email",
        "/request-password-reset",
      ],
    }),
  ],
  logger: {
    level: isProduction ? "error" : "debug",
  },
});

export type Auth = typeof auth;
