// Only load dotenv in development (not needed in Docker where env vars are set)
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
