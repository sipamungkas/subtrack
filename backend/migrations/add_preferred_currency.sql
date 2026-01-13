-- Add preferredCurrency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'USD';

-- Set default value for existing users
UPDATE users SET preferred_currency = 'USD' WHERE preferred_currency IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN preferred_currency SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.preferred_currency IS 'User''s preferred currency for dashboard stats display';

-- NOTE: This project uses Drizzle ORM. The proper workflow is:
-- 1. Update schema in backend/src/db/schema.ts (see Task 2)
-- 2. Run: bun run db:migrate (uses drizzle-kit push)
-- This SQL file is kept for documentation/reference purposes.
-- Actual migration will be applied via Drizzle in Task 14 final verification.
