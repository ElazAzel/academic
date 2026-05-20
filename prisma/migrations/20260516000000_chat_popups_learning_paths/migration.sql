-- Safe additive migration for schema objects introduced around chat, popups,
-- notifications, and learning paths. The statements are idempotent because
-- some development databases were already updated with `prisma db push`.

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS certificates_verification_code_key ON certificates(verification_code) WHERE verification_code IS NOT NULL;

ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS body JSONB NOT NULL DEFAULT '{}';

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref_id TEXT;

ALTER TABLE glossary_entries ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'general';

CREATE TABLE IF NOT EXISTS admin_popups (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  target_roles TEXT NOT NULL DEFAULT '[]',
  target_cohort_ids TEXT NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS popup_views (
  id TEXT PRIMARY KEY,
  popup_id TEXT NOT NULL REFERENCES admin_popups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(popup_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  text TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS learning_path_courses (
  id TEXT PRIMARY KEY,
  learning_path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(learning_path_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning_path_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  progress DOUBLE PRECISION NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, learning_path_id)
);

CREATE INDEX IF NOT EXISTS outbox_events_status_created_at_idx ON outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS certificates_issued_at_idx ON certificates(issued_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_status_created_at_idx ON notifications(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_status_idx ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS notifications_ref_type_ref_id_idx ON notifications(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS admin_popups_is_active_created_at_idx ON admin_popups(is_active, created_at);
CREATE INDEX IF NOT EXISTS popup_views_user_id_idx ON popup_views(user_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_lesson_id_idx ON messages(lesson_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_receiver_id_idx ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS glossary_entries_direction_idx ON glossary_entries(direction);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS learning_paths_status_idx ON learning_paths(status);
CREATE INDEX IF NOT EXISTS learning_paths_created_at_idx ON learning_paths(created_at);
CREATE INDEX IF NOT EXISTS learning_path_courses_learning_path_id_idx ON learning_path_courses(learning_path_id);
CREATE INDEX IF NOT EXISTS learning_path_courses_course_id_idx ON learning_path_courses(course_id);
CREATE INDEX IF NOT EXISTS learning_path_enrollments_user_id_idx ON learning_path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS learning_path_enrollments_learning_path_id_idx ON learning_path_enrollments(learning_path_id);
