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

// ── Блоки контента урока (Discriminated Union) ──────────────────────
export type ContentBlockType = "video" | "text" | "file" | "quiz" | "assignment" | "rating" | "curator_question" | "completion" | "scorm";

export type VideoProvider = "youtube" | "vimeo" | "bunny" | "mux" | "cloudflare" | "peertube";

export interface LessonVideo {
  provider: VideoProvider;
  providerVideoId: string;
  originalUrl?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isPrivate: boolean;
}

export interface VideoBlockData {
  /** Новая структурированная информация о видео */
  video?: LessonVideo;
  /** @deprecated Используйте `video` */
  videoUrl?: string;
  title?: string;
  /** @deprecated Длительность в минутах (legacy) */
  duration?: number;
}

export interface TextBlockData {
  html: string;
}

export interface FileBlockData {
  url: string;
  filename?: string;
  fileType?: string;
}

export interface QuizBlockData {
  quizId: string;
}

export interface AssignmentBlockData {
  assignmentId: string;
}

export interface RatingBlockData {
  lessonId: string;
}

export interface CuratorQuestionBlockData {
  lessonId: string;
}

export interface CompletionBlockData {
  label?: string;
}

export interface ScormBlockData {
  packageId: string;
  lessonId: string;
}

export type ContentBlockData =
  | VideoBlockData
  | TextBlockData
  | FileBlockData
  | QuizBlockData
  | AssignmentBlockData
  | RatingBlockData
  | CuratorQuestionBlockData
  | CompletionBlockData
  | ScormBlockData;

export interface ContentBlockBase {
  id: string;
}

export interface VideoContentBlock extends ContentBlockBase {
  type: "video";
  data: VideoBlockData;
}

export interface TextContentBlock extends ContentBlockBase {
  type: "text";
  data: TextBlockData;
}

export interface FileContentBlock extends ContentBlockBase {
  type: "file";
  data: FileBlockData;
}

export interface QuizContentBlock extends ContentBlockBase {
  type: "quiz";
  data: QuizBlockData;
}

export interface AssignmentContentBlock extends ContentBlockBase {
  type: "assignment";
  data: AssignmentBlockData;
}

export interface RatingContentBlock extends ContentBlockBase {
  type: "rating";
  data: RatingBlockData;
}

export interface CuratorQuestionContentBlock extends ContentBlockBase {
  type: "curator_question";
  data: CuratorQuestionBlockData;
}

export interface CompletionContentBlock extends ContentBlockBase {
  type: "completion";
  data: CompletionBlockData;
}

export interface ScormContentBlock extends ContentBlockBase {
  type: "scorm";
  data: ScormBlockData;
}

export type ContentBlock =
  | VideoContentBlock
  | TextContentBlock
  | FileContentBlock
  | QuizContentBlock
  | AssignmentContentBlock
  | RatingContentBlock
  | CuratorQuestionContentBlock
  | CompletionContentBlock
  | ScormContentBlock;

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
  blocks: BuilderBlockDetail[];
  lessons: BuilderLessonDetail[]; // kept for backward compat
}

export interface BuilderBlockDetail {
  id: string;
  order: number;
  title: string;
  description?: string | null;
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
  blockId?: string | null;
  blockTitle?: string | null;
  blockOrder?: number | null;
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
  enrollmentId: string;
  courseId: string;
  cohortId?: string | null;
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
  lessonId?: string;
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
  /** Количество отвеченных вопросов (всего) */
  questionsAnswered: number;
  /** Количество отправленных сообщений (всего) */
  messagesSent: number;
  /** Был ли онлайн за последние 5 минут */
  isOnline: boolean;
  /** Последний раз заходил */
  lastSeenAt: string | null;
}

export type SuperCuratorWorkloadLevel = "normal" | "watch" | "overloaded" | "critical";

export interface SuperCuratorWorkload extends CuratorLoad {
  curatorEmail: string;
  cohorts: string[];
  activeRisks: number;
  criticalRisks: number;
  unreadMessages: number;
  workloadScore: number;
  workloadLevel: SuperCuratorWorkloadLevel;
  nextActionLabel: string;
  nextActionHref: string;
}

export interface SuperCuratorCohortOperation {
  cohortId: string;
  cohortName: string;
  courseTitle: string;
  status: string;
  studentsCount: number;
  curatorCount: number;
  avgProgress: number;
  openQuestions: number;
  pendingReviews: number;
  activeRisks: number;
  criticalRisks: number;
  overloadedCurators: number;
  nextActionLabel: string;
  nextActionHref: string;
}

export interface SuperCuratorProblemQuestion {
  id: string;
  text: string;
  status: "OPEN" | "FORWARDED";
  studentName: string;
  studentEmail: string;
  curatorId: string | null;
  curatorName: string | null;
  cohortId: string | null;
  cohortName: string | null;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  createdAt: string;
  ageHours: number;
}

export interface SuperCuratorRiskQueueItem {
  id: string;
  type: string;
  severity: RiskSeverity;
  studentName: string;
  studentEmail: string;
  curatorId: string | null;
  curatorName: string | null;
  cohortId: string | null;
  cohortName: string | null;
  courseTitle: string;
  createdAt: string;
  ageDays: number;
}

export interface CuratorStudentDeadline {
  title: string;
  dueAt: string;
  daysLeft: number;
  overdue: boolean;
  scope: "course" | "module" | "block";
}

export interface CuratorStudentLastContext {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  blockTitle?: string | null;
  updatedAt: string;
}

export type CuratorNextActionKind =
  | "risk"
  | "question"
  | "assignment"
  | "chat"
  | "deadline"
  | "check_in"
  | "monitor";

export interface CuratorNextAction {
  kind: CuratorNextActionKind;
  label: string;
  href: string;
  tone: "primary" | "warning" | "danger" | "neutral";
  reason: string;
}

export interface CuratorStudentOperation {
  assignmentId: string;
  studentId: string;
  name: string;
  email: string;
  cohortId: string;
  cohortName: string;
  courseId: string | null;
  courseTitle: string;
  progressPercent: number;
  progressStatus: ProgressStatus;
  lastLoginAt: string | null;
  daysSinceLogin: number | null;
  lastContext: CuratorStudentLastContext | null;
  nextDeadline: CuratorStudentDeadline | null;
  openQuestions: number;
  pendingAssignments: number;
  activeRisks: number;
  highestRiskSeverity: RiskSeverity | null;
  unreadMessages: number;
  lastMessageAt: string | null;
  nextAction: CuratorNextAction;
  /** Среднее время ответа на вопросы (часы) */
  avgResponseHours: number;
  /** Среднее время ответа в чате (часы) */
  avgChatResponseHours: number;
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

// ── Метрики дашборда ────────────────────────────────────────────────
export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: string;
  description?: string;
  detail?: string;
  href?: string;
  priority?: "normal" | "elevated" | "critical";
  tone: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}
