-- Add preferredCurrency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'USD';

-- Set default value for existing users
UPDATE users SET preferred_currency = 'USD' WHERE preferred_currency IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN preferred_currency SET NOT NULL;

-- Add comment
COMMENT ON COLUMN users.preferred_currency IS 'User''s preferred currency for dashboard stats display';
