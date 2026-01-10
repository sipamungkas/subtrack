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
