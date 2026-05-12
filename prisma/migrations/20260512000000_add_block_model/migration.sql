-- Add Block model between Module and Lesson
-- Course → Module → Block → Lesson

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, "order")
);

CREATE TABLE IF NOT EXISTS block_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  percent INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, block_id)
);

CREATE INDEX IF NOT EXISTS block_progress_user_id_idx ON block_progress(user_id);
CREATE INDEX IF NOT EXISTS block_progress_block_id_idx ON block_progress(block_id);
CREATE INDEX IF NOT EXISTS block_progress_enrollment_id_idx ON block_progress(enrollment_id);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS block_id TEXT REFERENCES blocks(id) ON DELETE SET NULL;
