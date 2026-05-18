-- Keep production databases created before the 2FA feature compatible with the
-- current Prisma User model and Auth.js credentials lookup.
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT;
