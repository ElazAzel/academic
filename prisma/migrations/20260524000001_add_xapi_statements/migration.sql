-- Create xAPI LRS statement storage

CREATE TABLE IF NOT EXISTS xapi_statements (
  id TEXT PRIMARY KEY,
  statement JSONB NOT NULL,
  stored TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  lesson_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_xapi_statements_user ON xapi_statements(user_id);
