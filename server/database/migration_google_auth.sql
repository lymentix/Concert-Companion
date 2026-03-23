-- Migration: Add Google OAuth support
-- Run this against your existing database instead of re-running the full schema.sql

-- 1. Make spotify_id nullable (Google-only users won't have one)
ALTER TABLE users ALTER COLUMN spotify_id DROP NOT NULL;

-- 2. Add google_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- 3. Add auth_provider column to track which provider(s) a user used
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'spotify';

-- 4. Backfill existing Spotify users
UPDATE users SET auth_provider = 'spotify' WHERE auth_provider IS NULL;

-- 5. Add a constraint ensuring every user has at least one provider ID
ALTER TABLE users ADD CONSTRAINT users_has_provider
    CHECK (spotify_id IS NOT NULL OR google_id IS NOT NULL);

-- 6. Add index for google_id lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

SELECT 'Migration completed successfully!' AS message;
