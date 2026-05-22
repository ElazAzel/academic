-- Fix schema mismatches between Prisma schema and actual database.
-- These columns exist in schema.prisma but were never created in migrations
-- or were created with different names/types.

-- ═══════════════════════════════════════════════════════════════════
-- 1. lesson_progress: missing started_at and last_seen_at
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════
-- 2. assignment_submissions: rename created_at → submitted_at,
--    drop updated_at (not in Prisma schema)
-- ═══════════════════════════════════════════════════════════════════
-- Drop indexes that reference the old column name
DROP INDEX IF EXISTS idx_assignment_submissions_user_status_submitted_at;
DROP INDEX IF EXISTS idx_assignment_submissions_status_submitted_at;

-- Rename created_at → submitted_at
ALTER TABLE assignment_submissions RENAME COLUMN created_at TO submitted_at;

-- Drop updated_at column (not in Prisma schema)
ALTER TABLE assignment_submissions DROP COLUMN IF EXISTS updated_at;

-- Drop old indexes that were based on old column structure
DROP INDEX IF EXISTS assignment_submissions_created_at_idx;

-- ═══════════════════════════════════════════════════════════════════
-- 3. activity_logs: rename entity→resource, entity_id→resource_id,
--    add ip_address, session_id, fix FK to CASCADE
-- ═══════════════════════════════════════════════════════════════════
-- Add missing columns
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Rename columns (IF NOT EXISTS pattern requires checking existence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_logs' AND column_name='entity') THEN
    ALTER TABLE activity_logs RENAME COLUMN entity TO resource;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='activity_logs' AND column_name='entity_id') THEN
    ALTER TABLE activity_logs RENAME COLUMN entity_id TO resource_id;
  END IF;
END $$;

-- Set metadata default if not already set
ALTER TABLE activity_logs ALTER COLUMN metadata SET DEFAULT '{}';

-- Fix user_id: handle any existing NULLs, then set NOT NULL, fix FK to CASCADE
UPDATE activity_logs SET user_id = 'deleted' WHERE user_id IS NULL;
ALTER TABLE activity_logs ALTER COLUMN user_id SET NOT NULL;

-- Drop old FK and recreate with CASCADE
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- 4. risk_flags: rename student_id→user_id, add cohort_id,
--    fix FK for course_id to CASCADE
-- ═══════════════════════════════════════════════════════════════════
-- Rename student_id → user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_flags' AND column_name='student_id') THEN
    ALTER TABLE risk_flags RENAME COLUMN student_id TO user_id;
  END IF;
END $$;

-- Add cohort_id column and FK
ALTER TABLE risk_flags ADD COLUMN IF NOT EXISTS cohort_id TEXT REFERENCES cohorts(id) ON DELETE SET NULL;

-- Fix course_id FK to CASCADE (consistent with Prisma schema)
ALTER TABLE risk_flags DROP CONSTRAINT IF EXISTS risk_flags_course_id_fkey;
ALTER TABLE risk_flags ADD CONSTRAINT risk_flags_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- 5. reports: add project_id, course_id, url, drop created_by_id,
--    fix status default
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE reports ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS url TEXT;

-- Drop created_by_id (not in Prisma schema, but may have FK constraint)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_created_by_id_fkey;
ALTER TABLE reports DROP COLUMN IF EXISTS created_by_id;

-- Fix status default to match Prisma schema (ready, not PENDING)
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'ready';

-- ═══════════════════════════════════════════════════════════════════
-- 6. admin_popups: add target_user_ids
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE admin_popups ADD COLUMN IF NOT EXISTS target_user_ids TEXT NOT NULL DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════════════
-- 7. messages: add reply_to_id
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON messages(reply_to_id);

-- ═══════════════════════════════════════════════════════════════════
-- 8. certificates: add unique constraint on (user_id, course_id)
-- ═══════════════════════════════════════════════════════════════════
-- First clean any potential duplicates (keep the earliest issued)
DELETE FROM certificates a USING (
  SELECT MIN(ctid) as ctid, user_id, course_id
  FROM certificates
  GROUP BY user_id, course_id
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id AND a.course_id = b.course_id AND a.ctid <> b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_id_course_id_key
  ON certificates(user_id, course_id);

-- ═══════════════════════════════════════════════════════════════════
-- 9. course.finalAssignmentId: add FK constraint
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_final_assignment_id_fkey'
    AND table_name = 'courses'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_final_assignment_id_fkey
      FOREIGN KEY (final_assignment_id) REFERENCES assignments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 10. quizzes: fix max_attempts default to match Prisma schema
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE quizzes ALTER COLUMN max_attempts SET DEFAULT 3;

-- ═══════════════════════════════════════════════════════════════════
-- 11. discussion_posts: parent_id FK already has CASCADE,
--     which is more useful than Prisma's default NO ACTION.
--     Keeping CASCADE — no change needed.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 12. Create indexes that are in the Prisma schema
--     but missing from the database
-- ═══════════════════════════════════════════════════════════════════

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS assignment_submissions_submitted_at_idx ON assignment_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_status_submitted_at
  ON assignment_submissions(user_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status_submitted_at
  ON assignment_submissions(status, submitted_at);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS activity_logs_action_idx ON activity_logs(action);
CREATE INDEX IF NOT EXISTS activity_logs_session_id_idx ON activity_logs(session_id);

-- Risk flags indexes
CREATE INDEX IF NOT EXISTS risk_flags_cohort_id_idx ON risk_flags(cohort_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_cohort_status_resolved ON risk_flags(cohort_id, status, resolved_at);

-- Reports indexes
CREATE INDEX IF NOT EXISTS reports_project_id_idx ON reports(project_id);
CREATE INDEX IF NOT EXISTS reports_course_id_idx ON reports(course_id);
