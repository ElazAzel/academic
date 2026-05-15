/**
 * Доменные типы AI Strategic Academy LMS.
 * Используются во всех UI-компонентах и server actions.
 */

// ── Роли ────────────────────────────────────────────────────────────
export type RoleKey =
  | "admin"
  | "instructor"
  | "student"
  | "curator"
  | "super_curator"
  | "customer_observer";

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: "Администратор",
  instructor: "Преподаватель",
  student: "Слушатель",
  curator: "Куратор",
  super_curator: "Супер-куратор",
  customer_observer: "Заказчик",
};

// ── Статусы ─────────────────────────────────────────────────────────
export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
export type EnrollmentStatus = "INVITED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "NEEDS_REVISION";
export type RiskType = "inactive_login" | "inactive_learning" | "behind_schedule" | "overdue_module" | "certificate_risk";
export type RiskSeverity = "low" | "medium" | "high" | "critical";

// ── Пользователи ───────────────────────────────────────────────────
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  lastLoginAt?: string | null;
}

export interface AppSessionUser {
  id: string;
  email: string;
  name?: string | null;
  roles: RoleKey[];
}

// ── Курсы ───────────────────────────────────────────────────────────
export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl?: string | null;
  durationHours: number;
  status: CourseStatus;
  traversalMode: "sequential" | "open";
  modulesCount: number;
  blocksCount?: number;
  lessonsCount: number;
  avgProgress?: number;
  instructors: UserSummary[];
}

export interface CourseDetail extends CourseSummary {
  goal?: string | null;
  completionThreshold: number;
  modules: ModuleDetail[];
  blocksCount?: number;
}

// ── Блоки ──────────────────────────────────────────────────────────
export interface BlockSummary {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  description?: string | null;
  lessonsCount: number;
  status: CourseStatus;
}

export interface BlockDetail extends BlockSummary {
  lessons: LessonSummary[];
}

export interface BlockLearningDetail extends BlockSummary {
  progressPercent: number;
  progressStatus: ProgressStatus;
  lessons: LessonLearningSummary[];
}

// ── Модули ──────────────────────────────────────────────────────────
export interface ModuleSummary {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  blocksCount?: number;
  lessonsCount: number;
  recommendedDays: number;
  status: CourseStatus;
}

export interface ModuleDetail extends ModuleSummary {
  blocks?: BlockDetail[];
  lessons: LessonSummary[];
}

export interface ModuleLearningDetail extends ModuleSummary {
  progressPercent: number;
  progressStatus: ProgressStatus;
  deadlineDate?: string | null;
  blocks?: BlockLearningDetail[];
  lessons: LessonLearningSummary[];
}

// ── Уроки ───────────────────────────────────────────────────────────
export type LessonType = "VIDEO" | "TEXT" | "DOCUMENT" | "VIDEO_DOCUMENT" | "QUIZ" | "ASSIGNMENT" | "LIVE" | "RECORDING" | "MIXED";

export interface LessonSummary {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isRequired: boolean;
  blockId?: string | null;
  blockTitle?: string;
  progressStatus?: ProgressStatus;
  progressPercent?: number;
}

export interface LessonLearningSummary extends LessonSummary {
  moduleId: string;
  moduleTitle: string;
  progressStatus: ProgressStatus;
  progressPercent: number;
  locked: boolean;
  lockReason?: string | null;
}

export interface LessonDetail extends LessonSummary {
  summary?: string | null;
  content: Record<string, unknown>;
  videoUrl?: string | null;
  media: LessonMediaItem[];
  quizzes: QuizSummary[];
  assignments: AssignmentSummary[];
}

// ── Блоки контента урока (PR 3) ─────────────────────────────────────
export type ContentBlockType = "video" | "text" | "file" | "quiz" | "assignment" | "rating" | "curator_question" | "completion";

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  data: Record<string, unknown>;
}

// ── Course Builder (PR 5) ──────────────────────────────────────────
export interface BuilderLessonDetail {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  summary?: string | null;
  durationMinutes: number;
  isRequired: boolean;
  blockId?: string | null;
  content: Record<string, unknown>;
  videoUrl?: string | null;
  quizzes: QuizSummary[];
  assignments: AssignmentSummary[];
}

export interface BuilderModuleDetail {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  recommendedDays: number;
  status: CourseStatus;
  lessons: BuilderLessonDetail[];
}

export interface CourseBuilderDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal?: string | null;
  coverUrl?: string | null;
  durationHours: number;
  status: CourseStatus;
  traversalMode: "sequential" | "open";
  completionThreshold: number;
  modules: BuilderModuleDetail[];
}

export interface StudentLessonPlayerDetail {
  lesson: StudentLessonLearningDetail;
  blocks: ContentBlock[];
  courseTree: ModulePlayerDetail[];
  quizDetails: StudentQuizDetail[];
  assignmentDetails: StudentAssignmentDetail[];
  curatorId?: string;
  curatorName?: string;
}

// ── Плеер курса (PR 2) ──────────────────────────────────────────────
export type CompletionCta = "start" | "continue" | "repeat" | "locked";

export interface LessonPlayerCard {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isRequired: boolean;
  status: ProgressStatus;
  lockReason?: string;
  hasQuiz: boolean;
  hasAssignment: boolean;
  completionCta: CompletionCta;
}

export interface ModulePlayerDetail {
  id: string;
  order: number;
  title: string;
  progressPercent: number;
  lessons: LessonPlayerCard[];
  deadline?: { date: string; overdue: boolean };
}

export interface StudentCoursePlayerDetail {
  course: CourseSummary;
  enrollment: EnrollmentStatus;
  progress: { completed: number; total: number; percent: number };
  modules: ModulePlayerDetail[];
  nextLessonId?: string;
  curator?: { name: string; unansweredCount: number };
  certificateEligible: boolean;
  completionThreshold: number;
}

export interface StudentCourseLearningDetail extends CourseSummary {
  goal?: string | null;
  completionThreshold: number;
  enrollmentId: string;
  cohortName?: string | null;
  coursePercent: number;
  progressStatus: ProgressStatus;
  modules: ModuleLearningDetail[];
  nextLessonId?: string | null;
}

export interface LessonQuestionSummary {
  id: string;
  text: string;
  status: "open" | "answered";
  createdAt: string;
  answer?: string | null;
  answeredAt?: string | null;
}

export interface StudentLessonLearningDetail extends LessonDetail {
  progressPercent: number;
  progressStatus: ProgressStatus;
  moduleTitle: string;
  moduleId: string;
  courseTitle: string;
  courseId: string;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string; locked: boolean } | null;
}

export interface StudentModuleLearningDetail extends ModuleLearningDetail {
  courseId: string;
  courseTitle: string;
}

export interface LessonMediaItem {
  id: string;
  type: string;
  url: string;
  filename?: string | null;
}

// ── Потоки (Cohorts) ────────────────────────────────────────────────
export interface CohortSummary {
  id: string;
  name: string;
  courseTitle: string;
  startsAt?: string | null;
  endsAt?: string | null;
  status: string;
  studentsCount: number;
}

export interface CohortDeadline {
  moduleId: string;
  moduleTitle: string;
  courseTitle?: string;
  dueAt: string;
  daysLeft: number;
  isOverdue: boolean;
}

// ── Прогресс ────────────────────────────────────────────────────────
export interface StudentProgress {
  courseId: string;
  courseTitle: string;
  percent: number;
  status: ProgressStatus;
  currentModuleTitle?: string;
  currentBlockTitle?: string;
  currentLessonTitle?: string;
  nextLessonId?: string;
}

export interface StudentAnalyticsDetail {
  id: string;
  name: string;
  email: string;
  courseTitle: string;
  cohortName?: string;
  coursePercent: number;
  moduleTitle?: string;
  blockTitle?: string;
  lessonTitle?: string;
  lastLoginAt?: string | null;
  avgLessonMinutes: number;
  progressStatus: string;
  riskCount: number;
}

export interface ContinueLearning {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  coursePercent: number;
  modulePercent: number;
  deadlineDate?: string | null;
  deadlineDaysLeft?: number | null;
}

// ── Тесты ───────────────────────────────────────────────────────────
export interface QuizSummary {
  id: string;
  title: string;
  passThreshold: number;
  maxAttempts: number;
  questionsCount: number;
}

// ── Задания ─────────────────────────────────────────────────────────
export interface AssignmentSummary {
  id: string;
  title: string;
  deadline?: string | null;
  maxAttempts: number;
  submissionStatus?: SubmissionStatus | null;
}

export interface StudentQuizDetail extends QuizSummary {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  questions: QuizQuestionDetail[];
}

export interface QuizQuestionDetail {
  id: string;
  type: string;
  text: string;
  options: string[];
}

export interface StudentAssignmentDetail extends AssignmentSummary {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  instructions: string;
  submission?: {
    id: string;
    answerText?: string | null;
    fileUrl?: string | null;
    status: SubmissionStatus;
    feedback?: string | null;
    score?: number | null;
    submittedAt: string;
  } | null;
}

export interface SubmissionForReview {
  id: string;
  assignmentTitle: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  lessonTitle: string;
  answerText?: string | null;
  fileUrl?: string | null;
  attemptNumber: number;
  submittedAt: string;
  status: SubmissionStatus;
}

// ── Вопросы ─────────────────────────────────────────────────────────
export interface QuestionFromStudent {
  id: string;
  text: string;
  studentName: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  status: "open" | "answered" | "forwarded";
  createdAt: string;
  answer?: string | null;
  answeredAt?: string | null;
}

// ── Риски ───────────────────────────────────────────────────────────
export interface RiskItem {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  cohortName?: string;
  status: "open" | "resolved";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const RISK_LABELS: Record<RiskType, string> = {
  inactive_login: "Давно не заходил",
  inactive_learning: "Нет учебной активности",
  behind_schedule: "Не успевает",
  overdue_module: "Модуль просрочен",
  certificate_risk: "Сертификат под угрозой",
};

// ── Кураторство ─────────────────────────────────────────────────────
export interface CuratorLoad {
  curatorId: string;
  curatorName: string;
  studentsCount: number;
  openQuestions: number;
  pendingReviews: number;
  avgResponseHours: number;
  riskStudents: number;
}

// ── Сертификаты ─────────────────────────────────────────────────────
export interface CertificateSummary {
  id: string;
  number: string;
  courseTitle: string;
  studentName: string;
  issuedAt: string;
  verificationUrl: string;
}

// ── Инвайты ─────────────────────────────────────────────────────────
export interface InviteLinkSummary {
  id: string;
  token: string;
  courseTitle?: string;
  cohortName?: string;
  maxActivations: number;
  activationCount: number;
  expiresAt?: string | null;
  status: string;
}

// ── Метрики дашборда ────────────────────────────────────────────────
export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: string;
  tone: "primary" | "success" | "warning" | "danger" | "info";
}
