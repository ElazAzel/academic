-- Add missing FK indexes for performance
-- Identified by audit: foreign key columns without any index

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_media_lesson_id ON lesson_media(lesson_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_course_id ON cohorts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_course_id ON certificate_templates(course_id);
CREATE INDEX IF NOT EXISTS idx_admin_popups_created_by_id ON admin_popups(created_by_id);
CREATE INDEX IF NOT EXISTS idx_popup_views_popup_id ON popup_views(popup_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_course_id ON reports(course_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by_id ON import_jobs(created_by_id);
