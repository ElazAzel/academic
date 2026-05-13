-- Add profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "position" TEXT;

-- Add composite index for course listing queries
CREATE INDEX IF NOT EXISTS courses_status_created_at_idx ON courses(status, created_at);

-- Add index for instructor lookups
CREATE INDEX IF NOT EXISTS course_instructors_user_id_idx ON course_instructors(user_id);
