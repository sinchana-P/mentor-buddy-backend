-- Migration to add authentication fields to users table
-- Run this in your Supabase SQL editor or database console

-- Add password column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- Add is_active column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add last_login_at column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Update any existing users to have a default password (they'll need to reset)
-- This is safe because we're adding authentication to an existing system
UPDATE users 
SET password = '$2b$12$default.password.hash.that.wont.match.anything'
WHERE password = '';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comments for documentation
COMMENT ON COLUMN users.password IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';