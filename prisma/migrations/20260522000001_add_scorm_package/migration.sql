-- Add SCORM/xAPI package import tables (Phase 2.4)

CREATE TABLE IF NOT EXISTS scorm_packages (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scorm_version TEXT NOT NULL DEFAULT '1.2',
  manifest JSONB NOT NULL DEFAULT '{}',
  storage_key TEXT NOT NULL,
  entry_url TEXT,
  status TEXT NOT NULL DEFAULT 'IMPORTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorm_packages_lesson ON scorm_packages(lesson_id);

CREATE TABLE IF NOT EXISTS scorm_launches (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'LAUNCHED',
  suspend_data TEXT,
  score FLOAT,
  max_score FLOAT,
  completion TEXT DEFAULT 'unknown',
  success TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorm_launches_package_user ON scorm_launches(package_id, user_id);
CREATE INDEX IF NOT EXISTS idx_scorm_launches_lesson_user ON scorm_launches(lesson_id, user_id);
