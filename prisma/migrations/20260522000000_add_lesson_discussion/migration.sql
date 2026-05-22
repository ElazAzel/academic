-- Add lesson discussion / forum feature (Phase 2.6)
-- Creates tables for per-lesson threaded discussions visible to all enrolled users.

CREATE TABLE IF NOT EXISTS lesson_discussions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discussion_posts (
  id TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_id TEXT REFERENCES discussion_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_discussion_created
  ON discussion_posts(discussion_id, created_at);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_user
  ON discussion_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_parent
  ON discussion_posts(parent_id);
