-- Create UserSession model for platform visit analytics.
-- Tracks user sessions with start/end time, duration, role, and metadata.

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    source TEXT NOT NULL DEFAULT 'web'
);

-- Add session_id to activity_logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES user_sessions(id);

-- Indexes for analytical queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_started_at ON user_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_role_started_at ON user_sessions(role, started_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
