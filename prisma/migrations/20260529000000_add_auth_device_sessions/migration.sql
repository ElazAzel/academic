-- Add auth device sessions used to limit concurrent logins per user.
-- This is separate from user_sessions, which remains visit analytics only.

CREATE TABLE IF NOT EXISTS auth_device_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    source TEXT NOT NULL DEFAULT 'web'
);

CREATE INDEX IF NOT EXISTS idx_auth_device_sessions_user_revoked_started
    ON auth_device_sessions(user_id, revoked_at, started_at);

CREATE INDEX IF NOT EXISTS idx_auth_device_sessions_user_last_seen
    ON auth_device_sessions(user_id, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_auth_device_sessions_revoked_at
    ON auth_device_sessions(revoked_at);
