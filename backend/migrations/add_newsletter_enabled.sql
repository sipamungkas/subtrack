-- Add newsletterEnabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_enabled BOOLEAN DEFAULT true;

-- Set default value for existing users (opt-in by default)
UPDATE users SET newsletter_enabled = true WHERE newsletter_enabled IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN newsletter_enabled SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.newsletter_enabled IS 'User preference for receiving newsletter and subscription reminder notifications';

-- NOTE: This project uses Drizzle ORM. The proper workflow is:
-- 1. Update schema in backend/src/db/schema.ts (completed in Task 1)
-- 2. Run: bun run --cwd backend db:push (uses drizzle-kit push)
-- This SQL file is kept for documentation/reference purposes.
