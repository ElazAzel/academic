/**
 * Типизированные mock-данные для дашбордов.
 * Когда реальная БД будет подключена, эти данные заменятся на server actions.
 */
import type {
  ContinueLearning,
  CourseSummary,
  CuratorLoad,
  DashboardMetric,
  QuestionFromStudent,
  RiskItem,
  StudentProgress,
  SubmissionForReview,
  CohortSummary,
  CertificateSummary,
  InviteLinkSummary,
} from "@/types/domain";

// ── Курсы ───────────────────────────────────────────────────────────
export const MOCK_COURSES: CourseSummary[] = [
  {
    id: "c1",
    slug: "ai-strategy-fundamentals",
    title: "AI Strategy Fundamentals",
    description: "Практический курс по AI-стратегии для руководителей и менеджеров.",
    durationHours: 18,
    status: "PUBLISHED",
    traversalMode: "sequential",
    modulesCount: 4,
    lessonsCount: 12,
    instructors: [
      { id: "u-instr1", name: "Алия Нурланова", email: "instructor1@academy.local" },
    ],
  },
  {
    id: "c2",
    slug: "prompt-engineering-for-leaders",
    title: "Prompt Engineering for Leaders",
    description: "Курс по эффективным промптам для бизнес-задач.",
    durationHours: 12,
    status: "PUBLISHED",
    traversalMode: "open",
    modulesCount: 3,
    lessonsCount: 9,
    instructors: [
      { id: "u-instr2", name: "Иван Петров", email: "instructor2@academy.local" },
    ],
  },
  {
    id: "c3",
    slug: "ai-governance-and-risk",
    title: "AI Governance and Risk",
    description: "Управление рисками AI: compliance, этика и безопасность.",
    durationHours: 14,
    status: "DRAFT",
    traversalMode: "sequential",
    modulesCount: 3,
    lessonsCount: 8,
    instructors: [
      { id: "u-instr1", name: "Алия Нурланова", email: "instructor1@academy.local" },
      { id: "u-instr2", name: "Иван Петров", email: "instructor2@academy.local" },
    ],
  },
];

// ── Прогресс слушателя ──────────────────────────────────────────────
export const MOCK_STUDENT_PROGRESS: StudentProgress[] = [
  {
    courseId: "c1",
    courseTitle: "AI Strategy Fundamentals",
    percent: 45,
    status: "IN_PROGRESS",
    currentModuleTitle: "Модуль 2: Практика",
    currentLessonTitle: "Урок 3: Unit-экономика AI",
    nextLessonId: "l-c1-m2-3",
  },
  {
    courseId: "c2",
    courseTitle: "Prompt Engineering for Leaders",
    percent: 18,
    status: "IN_PROGRESS",
    currentModuleTitle: "Модуль 1: Основы",
    currentLessonTitle: "Урок 2: Структура промпта",
    nextLessonId: "l-c2-m1-2",
  },
];

// ── Продолжить обучение ─────────────────────────────────────────────
export const MOCK_CONTINUE_LEARNING: ContinueLearning = {
  courseId: "c1",
  courseTitle: "AI Strategy Fundamentals",
  moduleTitle: "Модуль 2: Практика",
  lessonId: "l-c1-m2-3",
  lessonTitle: "Unit-экономика AI",
  coursePercent: 45,
  modulePercent: 60,
  deadlineDate: "2026-05-18",
  deadlineDaysLeft: 11,
};

// ── Вопросы от слушателей ───────────────────────────────────────────
export const MOCK_QUESTIONS: QuestionFromStudent[] = [
  {
    id: "q1",
    text: "Как рассчитать ROI от внедрения AI-ассистента?",
    studentName: "Слушатель 1",
    courseTitle: "AI Strategy Fundamentals",
    moduleTitle: "Модуль 2: Практика",
    lessonTitle: "Урок 3: Unit-экономика AI",
    status: "open",
    createdAt: "2026-05-06T14:30:00Z",
  },
  {
    id: "q2",
    text: "Можно ли использовать GPT-4 для финансового моделирования?",
    studentName: "Слушатель 3",
    courseTitle: "Prompt Engineering for Leaders",
    moduleTitle: "Модуль 1: Основы",
    lessonTitle: "Урок 2: Структура промпта",
    status: "open",
    createdAt: "2026-05-06T10:15:00Z",
  },
  {
    id: "q3",
    text: "Какой формат данных лучше для fine-tuning?",
    studentName: "Слушатель 5",
    courseTitle: "AI Strategy Fundamentals",
    moduleTitle: "Модуль 1: Стратегия",
    lessonTitle: "Урок 1: Введение",
    status: "answered",
    createdAt: "2026-05-05T09:00:00Z",
    answer: "JSONL — стандартный формат для fine-tuning OpenAI моделей.",
    answeredAt: "2026-05-05T11:30:00Z",
  },
];

// ── Задания на проверку ─────────────────────────────────────────────
export const MOCK_SUBMISSIONS: SubmissionForReview[] = [
  {
    id: "s1",
    assignmentTitle: "План внедрения AI",
    studentName: "Слушатель 2",
    studentEmail: "student2@academy.local",
    courseTitle: "AI Strategy Fundamentals",
    lessonTitle: "Урок 2: Финальное задание",
    answerText: "Загружен PDF-документ с планом на 12 страниц.",
    fileUrl: "/uploads/plan-ai-student2.pdf",
    attemptNumber: 1,
    submittedAt: "2026-05-06T16:00:00Z",
    status: "SUBMITTED",
  },
  {
    id: "s2",
    assignmentTitle: "Практическое задание: Prompt Engineering",
    studentName: "Слушатель 4",
    studentEmail: "student4@academy.local",
    courseTitle: "Prompt Engineering for Leaders",
    lessonTitle: "Урок 2: Структура промпта",
    answerText: "Примеры промптов для HR-процессов.",
    attemptNumber: 2,
    submittedAt: "2026-05-06T12:00:00Z",
    status: "NEEDS_REVISION",
  },
];

// ── Риски ───────────────────────────────────────────────────────────
export const MOCK_RISKS: RiskItem[] = [
  {
    id: "r1",
    type: "inactive_login",
    severity: "high",
    studentName: "Слушатель 7",
    studentEmail: "student7@academy.local",
    courseTitle: "AI Strategy Fundamentals",
    cohortName: "Поток A",
    status: "open",
    createdAt: "2026-05-04T08:00:00Z",
    metadata: { daysSinceLogin: 5 },
  },
  {
    id: "r2",
    type: "inactive_learning",
    severity: "medium",
    studentName: "Слушатель 9",
    studentEmail: "student9@academy.local",
    courseTitle: "Prompt Engineering for Leaders",
    cohortName: "Поток B",
    status: "open",
    createdAt: "2026-05-05T08:00:00Z",
    metadata: { daysSinceActivity: 4 },
  },
  {
    id: "r3",
    type: "overdue_module",
    severity: "critical",
    studentName: "Слушатель 6",
    studentEmail: "student6@academy.local",
    courseTitle: "AI Strategy Fundamentals",
    cohortName: "Поток A",
    status: "open",
    createdAt: "2026-05-03T08:00:00Z",
  },
  {
    id: "r4",
    type: "certificate_risk",
    severity: "high",
    studentName: "Слушатель 8",
    studentEmail: "student8@academy.local",
    courseTitle: "AI Strategy Fundamentals",
    status: "open",
    createdAt: "2026-05-04T12:00:00Z",
  },
];

// ── Нагрузка кураторов ──────────────────────────────────────────────
export const MOCK_CURATOR_LOADS: CuratorLoad[] = [
  {
    curatorId: "u-cur1",
    curatorName: "Куратор Мадина",
    studentsCount: 15,
    openQuestions: 4,
    pendingReviews: 7,
    avgResponseHours: 3.2,
    riskStudents: 3,
  },
  {
    curatorId: "u-cur2",
    curatorName: "Куратор Арман",
    studentsCount: 12,
    openQuestions: 2,
    pendingReviews: 3,
    avgResponseHours: 1.8,
    riskStudents: 1,
  },
  {
    curatorId: "u-cur3",
    curatorName: "Куратор Дана",
    studentsCount: 18,
    openQuestions: 6,
    pendingReviews: 9,
    avgResponseHours: 5.1,
    riskStudents: 5,
  },
];

// ── Потоки ──────────────────────────────────────────────────────────
export const MOCK_COHORTS: CohortSummary[] = [
  {
    id: "coh-1",
    name: "AI Strategy — Поток A",
    courseTitle: "AI Strategy Fundamentals",
    startsAt: "2026-05-01",
    endsAt: "2026-06-30",
    status: "active",
    studentsCount: 15,
  },
  {
    id: "coh-2",
    name: "AI Strategy — Поток B",
    courseTitle: "AI Strategy Fundamentals",
    startsAt: "2026-05-15",
    endsAt: "2026-07-15",
    status: "active",
    studentsCount: 12,
  },
  {
    id: "coh-3",
    name: "Prompt Engineering — Поток A",
    courseTitle: "Prompt Engineering for Leaders",
    startsAt: "2026-05-10",
    endsAt: "2026-06-20",
    status: "active",
    studentsCount: 18,
  },
];

// ── Сертификаты ─────────────────────────────────────────────────────
export const MOCK_CERTIFICATES: CertificateSummary[] = [
  {
    id: "cert-1",
    number: "SA-2026-0001",
    courseTitle: "AI Strategy Fundamentals",
    studentName: "Слушатель 1",
    issuedAt: "2026-05-01T12:00:00Z",
    verificationUrl: "/certificates/verify/abc123",
  },
  {
    id: "cert-2",
    number: "SA-2026-0002",
    courseTitle: "AI Strategy Fundamentals",
    studentName: "Слушатель 3",
    issuedAt: "2026-05-03T14:00:00Z",
    verificationUrl: "/certificates/verify/def456",
  },
];

// ── Инвайты ─────────────────────────────────────────────────────────
export const MOCK_INVITES: InviteLinkSummary[] = [
  {
    id: "inv-1",
    token: "abc-123-xyz",
    courseTitle: "AI Strategy Fundamentals",
    cohortName: "Поток A",
    maxActivations: 20,
    activationCount: 15,
    expiresAt: "2026-06-01",
    status: "active",
  },
  {
    id: "inv-2",
    token: "def-456-uvw",
    courseTitle: "Prompt Engineering for Leaders",
    cohortName: "Поток A",
    maxActivations: 30,
    activationCount: 18,
    expiresAt: "2026-06-15",
    status: "active",
  },
];

// ── Метрики ─────────────────────────────────────────────────────────
export function getStudentMetrics(): DashboardMetric[] {
  return [
    { label: "Активные курсы", value: 2, tone: "primary" },
    { label: "Средний прогресс", value: "32%", tone: "warning" },
    { label: "Дедлайн", value: "11 дн.", tone: "info" },
    { label: "Сертификаты", value: 0, tone: "success" },
  ];
}

export function getCuratorMetrics(): DashboardMetric[] {
  return [
    { label: "Мои слушатели", value: 15, tone: "primary" },
    { label: "Открытые вопросы", value: 4, tone: "danger" },
    { label: "Задания на проверку", value: 7, tone: "warning" },
    { label: "Слушатели с рисками", value: 3, tone: "danger" },
  ];
}

export function getSuperCuratorMetrics(): DashboardMetric[] {
  return [
    { label: "Кураторов", value: 3, tone: "primary" },
    { label: "Всего слушателей", value: 45, tone: "info" },
    { label: "Нераспределённых", value: 2, tone: "warning" },
    { label: "Средний SLA", value: "3.4 ч", tone: "success" },
  ];
}

export function getAdminMetrics(): DashboardMetric[] {
  return [
    { label: "Курсы", value: 3, tone: "primary" },
    { label: "Потоки", value: 3, tone: "info" },
    { label: "Слушатели", value: 30, tone: "success" },
    { label: "Сертификаты", value: 2, tone: "warning" },
  ];
}

export function getInstructorMetrics(): DashboardMetric[] {
  return [
    { label: "Мои курсы", value: 2, tone: "primary" },
    { label: "Слушатели", value: 30, tone: "info" },
    { label: "Средний прогресс", value: "38%", tone: "warning" },
    { label: "Вопросы от кураторов", value: 1, tone: "success" },
  ];
}

export function getObserverMetrics(): DashboardMetric[] {
  return [
    { label: "Проект", value: 1, tone: "primary" },
    { label: "Потоки", value: 3, tone: "info" },
    { label: "Прогресс", value: "42%", tone: "warning" },
    { label: "Сертификаты", value: 2, tone: "success" },
  ];
}
