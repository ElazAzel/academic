/**
 * Единый файл констант для AI Strategic Academy LMS.
 * Все магические числа, строки, лимиты и пути определяются здесь.
 */

// ── Роуты ────────────────────────────────────────────────────────────

export const STUDENT_ROUTES = {
  dashboard: "/student",
  myCourses: "/student/my-courses",
  course: (courseId: string) => `/student/courses/${courseId}`,
  lesson: (lessonId: string) => `/student/lessons/${lessonId}`,
  quiz: (quizId: string) => `/student/quizzes/${quizId}`,
  quizResult: (quizId: string) => `/student/quizzes/${quizId}/result`,
  assignment: (assignmentId: string) => `/student/assignments/${assignmentId}`,
  notifications: "/student/notifications",
  certificates: "/student/certificates",
  settings: "/student/settings",
} as const;

export const INSTRUCTOR_ROUTES = {
  dashboard: "/instructor",
  courses: "/instructor/courses",
  courseBuilder: (courseId: string) => `/instructor/courses/${courseId}/builder`,
  courseNew: "/instructor/courses/new",
  quizzes: "/instructor/quizzes",
  quizEdit: (quizId: string) => `/instructor/quizzes/${quizId}/edit`,
  assignments: "/instructor/assignments",
  assignmentEdit: (assignmentId: string) => `/instructor/assignments/${assignmentId}/edit`,
  questions: "/instructor/questions",
  reports: "/instructor/reports",
  analytics: "/instructor/analytics",
  settings: "/instructor/settings",
} as const;

export const ADMIN_ROUTES = {
  dashboard: "/admin",
  users: "/admin/users",
  courses: "/admin/courses",
  courseBuilder: (courseId: string) => `/admin/courses/${courseId}/builder`,
  enrollments: "/admin/enrollments",
  cohorts: "/admin/cohorts",
  invites: "/admin/invites",
  reports: "/admin/reports",
  analytics: "/admin/analytics",
  audit: "/admin/audit",
  roles: "/admin/roles",
  settings: "/admin/settings",
} as const;

export const CURATOR_ROUTES = {
  dashboard: "/curator",
  students: "/curator/students",
  questions: "/curator/questions",
  assignments: "/curator/assignments",
  risks: "/curator/risks",
  reports: "/curator/reports",
  analytics: "/curator/analytics",
  settings: "/curator/settings",
} as const;

export const FORBIDDEN_ROUTE = "/403";

// ── Аутентификация ─────────────────────────────────────────────────────

export const AUTH_ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
} as const;

export const SUPER_CURATOR_ROUTES = {
  dashboard: "/super-curator",
  cohorts: "/super-curator/cohorts",
  curators: "/super-curator/curators",
  distribution: "/super-curator/distribution",
  users: "/super-curator/users",
  questions: "/super-curator/questions",
  notifications: "/super-curator/notifications",
  risks: "/super-curator/risks",
  reports: "/super-curator/reports",
  analytics: "/super-curator/analytics",
  settings: "/super-curator/settings",
} as const;

// ── Уведомления ───────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
  EMAIL_AND_IN_APP: "email_and_in_app",
  PUSH: "push",
} as const;

export const NOTIFICATION_PAGE_SIZE = 100;

// ── Пагинация ──────────────────────────────────────────────────────────

export const PAGE_SIZE = {
  USERS_LIST: 200,
  ENROLLMENTS_LIST: 200,
  AUDIT_LIST: 50,
  RISK_LIST: 200,
  CHAT_LIST: 200,
  SEARCH_LIST: 10,
  ADMIN_ANALYTICS: 10,
  COURSES_LIST: 50,
  SUPER_CURATOR_LIST: 50,
  SUPER_CURATOR_BULK: 500,
} as const;

// ── Прогресс ──────────────────────────────────────────────────────────

export const PROGRESS = {
  COMPLETION_THRESHOLD: 100,
  RECENT_PROGRESS_COUNT: 5,
  CERTIFICATE_AUTO_THRESHOLD: 85, // соответствует env.CERTIFICATE_COMPLETION_THRESHOLD
} as const;

export const QUESTIONS_PAGE_SIZE = 10;

// ── Тесты и задания ───────────────────────────────────────────────────

export const QUIZ = {
  DEFAULT_PASS_THRESHOLD: 80,
  DEFAULT_MAX_ATTEMPTS: 3,
} as const;

export const ASSIGNMENT = {
  DEFAULT_MAX_SCORE: 100,
  DEFAULT_MAX_ATTEMPTS: 3,
  MAX_ANSWER_LENGTH: 10_000,
} as const;

// ── Загрузка файлов ───────────────────────────────────────────────────

export const UPLOAD = {
  /** Максимальный размер файла в МБ (по спецификации) */
  MAX_FILE_SIZE_MB: 20,
  /** Максимальный размер файла в байтах */
  get MAX_FILE_SIZE_BYTES(): number { return this.MAX_FILE_SIZE_MB * 1024 * 1024; },
  /** Допустимые MIME-типы (синхронизировано с upload route) */
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/webm",
    "application/zip",
  ] as readonly string[],
} as const;

// ── Курсы ─────────────────────────────────────────────────────────────

export const TRAVERSAL_MODES = {
  SEQUENTIAL: "sequential",
  OPEN: "open",
} as const;

export const COURSE = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 160,
  DESCRIPTION_MIN_LENGTH: 10,
  GOAL_MAX_LENGTH: 500,
  MIN_DURATION_HOURS: 0,
  MAX_DURATION_HOURS: 1000,
  MIN_COMPLETION_THRESHOLD: 0,
  MAX_COMPLETION_THRESHOLD: 100,
} as const;

// ── Модули ────────────────────────────────────────────────────────────

export const MODULE = {
  TITLE_MIN_LENGTH: 2,
  TITLE_MAX_LENGTH: 160,
  DEFAULT_RECOMMENDED_DAYS: 7,
} as const;

// ── Уроки ─────────────────────────────────────────────────────────────

export const LESSON = {
  TITLE_MIN_LENGTH: 2,
  TITLE_MAX_LENGTH: 160,
  CONTENT_BLOCKS_MAX_COUNT: 50,
} as const;

// ── Вопросы куратору ──────────────────────────────────────────────────

export const CURATOR_QUESTION = {
  TEXT_MIN_LENGTH: 5,
  TEXT_MAX_LENGTH: 3000,
} as const;

// ── Роли ──────────────────────────────────────────────────────────────

export const STUDENT_REQUIRED_ROLES = ["student"] as const;
export const INSTRUCTOR_REQUIRED_ROLES = ["instructor"] as const;
export const CURATOR_REQUIRED_ROLES = ["curator", "super_curator", "admin"] as const;
export const ADMIN_REQUIRED_ROLES = ["admin"] as const;

// ── Дашборд ───────────────────────────────────────────────────────────

export const DASHBOARD = {
  MAX_DISPLAY_COURSES: 3,
  MAX_DISPLAY_DEADLINES: 4,
  MAX_DISPLAY_ANSWERS: 4,
  CURATOR_OPEN_QUESTIONS_THRESHOLD: 3,
  CURATOR_PENDING_REVIEWS_THRESHOLD: 5,
  CURATOR_RESPONSE_HOURS_THRESHOLD: 4,
  CURATOR_RISK_STUDENTS_THRESHOLD: 3,
} as const;

// ── Прогресс (required-only completion) ───────────────────────────────

export function calculateProgressPercent(completedCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}
