-- Migrate User.status from String to UserAccountStatus enum
-- Migrate LessonQuestion.status from String to QuestionStatus enum

-- Create UserAccountStatus enum (if not exists -- safe for reruns)
DO $$ BEGIN
  CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create QuestionStatus enum (if not exists -- safe for reruns)
DO $$ BEGIN
  CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'FORWARDED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Migrate users.status to UserAccountStatus
ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE users ALTER COLUMN status TYPE "UserAccountStatus"
  USING CASE
    WHEN lower(trim(status)) = 'active' THEN 'ACTIVE'::"UserAccountStatus"
    WHEN lower(trim(status)) = 'inactive' THEN 'INACTIVE'::"UserAccountStatus"
    WHEN lower(trim(status)) = 'blocked' THEN 'BLOCKED'::"UserAccountStatus"
    WHEN lower(trim(status)) = 'deleted' THEN 'DELETED'::"UserAccountStatus"
    ELSE 'ACTIVE'::"UserAccountStatus"
  END;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'ACTIVE'::"UserAccountStatus";

-- Migrate lesson_questions.status to QuestionStatus
ALTER TABLE lesson_questions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE lesson_questions ALTER COLUMN status TYPE "QuestionStatus"
  USING CASE
    WHEN lower(trim(status)) = 'open' THEN 'OPEN'::"QuestionStatus"
    WHEN lower(trim(status)) = 'answered' THEN 'ANSWERED'::"QuestionStatus"
    WHEN lower(trim(status)) = 'forwarded' THEN 'FORWARDED'::"QuestionStatus"
    WHEN lower(trim(status)) = 'closed' THEN 'CLOSED'::"QuestionStatus"
    ELSE 'OPEN'::"QuestionStatus"
  END;
ALTER TABLE lesson_questions ALTER COLUMN status SET DEFAULT 'OPEN'::"QuestionStatus";
