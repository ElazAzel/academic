-- M-PR-11 Performance & Scale Pass
-- Targeted indexes for scoped dashboards, reports, chat, notifications, assignments, risks, and progress.

CREATE INDEX IF NOT EXISTS idx_lessons_block_order ON lessons (block_id, "order");

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status ON enrollments (course_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort_status ON enrollments (cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_status_created_at ON enrollments (status, created_at);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_updated_at ON lesson_progress (user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_course_progress_course_status ON course_progress (course_id, status);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_updated_at ON course_progress (user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes (course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes (lesson_id);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments (course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments (lesson_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_status_submitted_at
  ON assignment_submissions (user_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status_submitted_at
  ON assignment_submissions (status, submitted_at);

CREATE INDEX IF NOT EXISTS idx_lesson_questions_curator_status_created_at
  ON lesson_questions (curator_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_student_status_created_at
  ON lesson_questions (student_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_status_created_at
  ON lesson_questions (status, created_at);

CREATE INDEX IF NOT EXISTS idx_certificates_user_issued_at ON certificates (user_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_certificates_course_issued_at ON certificates (course_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_certificates_enrollment_id ON certificates (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at_created_at
  ON notifications (user_id, read_at, created_at);

CREATE INDEX IF NOT EXISTS idx_curator_assignments_super_curator_active
  ON curator_assignments (super_curator_id, active);
CREATE INDEX IF NOT EXISTS idx_curator_assignments_cohort_active
  ON curator_assignments (cohort_id, active);
CREATE INDEX IF NOT EXISTS idx_curator_assignments_active_assigned_at
  ON curator_assignments (active, assigned_at);

CREATE INDEX IF NOT EXISTS idx_risk_flags_user_status_resolved_created_at
  ON risk_flags (user_id, status, resolved_at, created_at);
CREATE INDEX IF NOT EXISTS idx_risk_flags_status_resolved_created_at
  ON risk_flags (status, resolved_at, created_at);
CREATE INDEX IF NOT EXISTS idx_risk_flags_cohort_status_resolved
  ON risk_flags (cohort_id, status, resolved_at);
CREATE INDEX IF NOT EXISTS idx_risk_flags_course_status_resolved
  ON risk_flags (course_id, status, resolved_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at ON messages (sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created_at ON messages (receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_created_at
  ON messages (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_created_at
  ON messages (receiver_id, sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read_at_created_at
  ON messages (receiver_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_lesson_created_at
  ON messages (sender_id, lesson_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_lesson_created_at
  ON messages (receiver_id, lesson_id, created_at);
