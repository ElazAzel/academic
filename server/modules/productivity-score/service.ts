import type { RoleKey as PrismaRoleKey } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import {
  getObserverScope,
  getScopedStudentIdsForObserver,
} from "@/server/modules/observer/scope";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import type { AppSessionUser } from "@/types/domain";

const prisma = getPrisma();

// ── Types ─────────────────────────────────────────────────────────────

export type ProductivityLevel = "beginner" | "practitioner" | "advanced" | "champion";

export interface ScoreComponent {
  /** Machine key: tests | assignments | final_project | activity | diagnostics */
  key: string;
  label: string;
  /** Weight as decimal (e.g. 0.20 for 20%) */
  weight: number;
  /** Normalised score 0–100 */
  score: number;
  /** Whether this component had data to compute from */
  available: boolean;
  /** Human explanation of the component result */
  detail: string;
}

export interface ProductivityScoreResult {
  userId: string;
  courseId: string;
  /** Overall score 0–100 */
  totalScore: number;
  level: ProductivityLevel;
  components: ScoreComponent[];
  /** ISO datetime of calculation */
  calculatedAt: string;
}

// ── Weights ────────────────────────────────────────────────────────────

const WEIGHTS = {
  tests: 0.20,
  assignments: 0.30,
  finalProject: 0.20,
  activity: 0.10,
  diagnostics: 0.20,
} as const;

const LEVEL_THRESHOLDS: { min: number; label: ProductivityLevel; name: string }[] = [
  { min: 90, label: "champion", name: "AI Productivity Champion" },
  { min: 70, label: "advanced", name: "Advanced User" },
  { min: 40, label: "practitioner", name: "Practitioner" },
  { min: 0, label: "beginner", name: "Beginner" },
];

function resolveLevel(score: number): ProductivityLevel {
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.min) return t.label;
  }
  return "beginner";
}

// ── Component calculators ─────────────────────────────────────────────

async function calcTests(userId: string, courseId: string): Promise<ScoreComponent> {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      quiz: { courseId },
      passed: true,
      submittedAt: { not: null },
    },
    include: {
      quiz: {
        select: {
          questions: { select: { points: true } },
        },
      },
    },
  });

  if (attempts.length === 0) {
    return {
      key: "tests",
      label: "Тесты",
      weight: WEIGHTS.tests,
      score: 0,
      available: false,
      detail: "Нет пройденных тестов",
    };
  }

  // Best attempt per quiz: take the highest score
  const quizBest = new Map<string, { score: number; maxPoints: number }>();
  for (const att of attempts) {
    const maxPoints = att.quiz.questions.reduce((s, q) => s + q.points, 0) || 1;
    const pct = Math.round((att.score / 100) * maxPoints) / maxPoints * 100;
    const existing = quizBest.get(att.quizId);
    if (!existing || pct > existing.score) {
      quizBest.set(att.quizId, { score: pct, maxPoints });
    }
  }

  const scores = Array.from(quizBest.values()).map((v) => v.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    key: "tests",
    label: "Тесты",
    weight: WEIGHTS.tests,
    score: avgScore,
    available: true,
    detail: `${avgScore}% средний балл по ${scores.length} тестам`,
  };
}

async function calcAssignments(
  userId: string,
  courseId: string,
  excludeFinalAssignmentId?: string | null,
): Promise<ScoreComponent> {
  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      userId,
      assignment: {
        courseId,
        ...(excludeFinalAssignmentId ? { id: { not: excludeFinalAssignmentId } } : {}),
      },
      status: { in: ["ACCEPTED", "SUBMITTED", "IN_REVIEW"] },
    },
    include: {
      assignment: { select: { maxScore: true } },
    },
  });

  if (submissions.length === 0) {
    return {
      key: "assignments",
      label: "Практические задания",
      weight: WEIGHTS.assignments,
      score: 0,
      available: false,
      detail: "Нет сданных заданий",
    };
  }

  const scoredSubmissions = submissions.filter((s) => s.score !== null);
  if (scoredSubmissions.length === 0) {
    return {
      key: "assignments",
      label: "Практические задания",
      weight: WEIGHTS.assignments,
      score: 0,
      available: false,
      detail: "Задания сданы, но ещё не оценены",
    };
  }

  const scores = scoredSubmissions.map((s) => {
    const max = s.assignment.maxScore || 100;
    return Math.round(((s.score ?? 0) / max) * 100);
  });
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    key: "assignments",
    label: "Практические задания",
    weight: WEIGHTS.assignments,
    score: avgScore,
    available: true,
    detail: `${avgScore}% средний балл по ${scores.length} оценённым заданию(ям)`,
  };
}

async function calcFinalProject(
  userId: string,
  courseId: string,
  finalAssignmentId?: string | null,
): Promise<ScoreComponent> {
  if (!finalAssignmentId) {
    return {
      key: "final_project",
      label: "Финальная работа",
      weight: WEIGHTS.finalProject,
      score: 0,
      available: false,
      detail: "Финальная работа не назначена для этого курса",
    };
  }

  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      userId,
      assignmentId: finalAssignmentId,
      status: { in: ["ACCEPTED", "SUBMITTED", "IN_REVIEW"] },
    },
    include: {
      assignment: { select: { maxScore: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  if (!submission) {
    return {
      key: "final_project",
      label: "Финальная работа",
      weight: WEIGHTS.finalProject,
      score: 0,
      available: false,
      detail: "Финальная работа не сдана",
    };
  }

  if (submission.score === null) {
    return {
      key: "final_project",
      label: "Финальная работа",
      weight: WEIGHTS.finalProject,
      score: 0,
      available: false,
      detail: "Финальная работа сдана, но ещё не оценена",
    };
  }

  const max = submission.assignment.maxScore || 100;
  const pct = Math.round(((submission.score ?? 0) / max) * 100);

  return {
    key: "final_project",
    label: "Финальная работа",
    weight: WEIGHTS.finalProject,
    score: pct,
    available: true,
    detail: `${pct}% — оценка за финальную работу`,
  };
}

async function calcActivity(userId: string, courseId: string): Promise<ScoreComponent> {
  const progress = await prisma.courseProgress.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { percent: true, status: true },
  });

  if (!progress) {
    return {
      key: "activity",
      label: "Активность и завершение",
      weight: WEIGHTS.activity,
      score: 0,
      available: true,
      detail: "Курс не начат (0%)",
    };
  }

  // Score is the completion percentage (already 0–100)
  return {
    key: "activity",
    label: "Активность и завершение",
    weight: WEIGHTS.activity,
    score: progress.percent,
    available: true,
    detail: `${progress.percent}% курса пройдено`,
  };
}

function calcDiagnostics(): ScoreComponent {
  return {
    key: "diagnostics",
    label: "Диагностика до/после",
    weight: WEIGHTS.diagnostics,
    score: 0,
    available: false,
    detail: "Диагностика пока не реализована (компонент не учитывается)",
  };
}

// ── Core calculation ──────────────────────────────────────────────────

async function calculateForUser(
  userId: string,
  courseId: string,
): Promise<ProductivityScoreResult> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, finalAssignmentId: true },
  });
  if (!course) {
    throw new ApiError("not_found", "Курс не найден", 404);
  }

  const [tests, assignments, finalProject, activity, diagnostics] = await Promise.all([
    calcTests(userId, courseId),
    calcAssignments(userId, courseId, course.finalAssignmentId),
    calcFinalProject(userId, courseId, course.finalAssignmentId),
    calcActivity(userId, courseId),
    Promise.resolve(calcDiagnostics()),
  ]);

  const components = [tests, assignments, finalProject, activity, diagnostics];

  // Calculate weighted total
  // Only weight from available components counts; unavailable components redistribute proportionally
  const availableComponents = components.filter((c) => c.available);
  const unavailableWeight = components
    .filter((c) => !c.available)
    .reduce((sum, c) => sum + c.weight, 0);

  let totalScore: number;
  if (availableComponents.length === 0) {
    totalScore = 0;
  } else if (unavailableWeight >= 0.99) {
    // No real data yet — use activity as sole signal
    totalScore = activity.score;
  } else {
    // Redistribute unavailable weight across available components
    const scaleFactor = 1 / (1 - unavailableWeight);
    totalScore = Math.round(
      availableComponents.reduce((sum, c) => sum + c.score * c.weight, 0) * scaleFactor,
    );
  }

  return {
    userId,
    courseId,
    totalScore,
    level: resolveLevel(totalScore),
    components,
    calculatedAt: new Date().toISOString(),
  };
}

// ── Cohort aggregation ────────────────────────────────────────────────

export interface CohortScoreSummary {
  average: number;
  distribution: Record<ProductivityLevel, number>;
  participants: number;
  scores: Array<{
    userId: string;
    totalScore: number;
    level: ProductivityLevel;
  }>;
}

async function calculateForCohort(
  cohortId: string,
  actor: AppSessionUser,
): Promise<CohortScoreSummary> {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { courseId: true },
  });
  if (!cohort) throw new ApiError("not_found", "Поток не найден", 404);
  if (!cohort.courseId) throw new ApiError("bad_request", "К потоку не привязан курс", 400);

  // RBAC scope — user must have access to this cohort
  await assertCohortAccess(actor, cohortId);

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId, status: "ACTIVE" },
    select: { userId: true },
  });

  const userIds = enrollments.map((e) => e.userId);
  if (userIds.length === 0) {
    return {
      average: 0,
      distribution: { beginner: 0, practitioner: 0, advanced: 0, champion: 0 },
      participants: 0,
      scores: [],
    };
  }

  const results = await Promise.all(
    userIds.map((uid) =>
      calculateForUser(uid, cohort.courseId!).catch(() => null),
    ),
  );

  const validResults = results.filter((r): r is ProductivityScoreResult => r !== null);

  const average =
    validResults.length > 0
      ? Math.round(
          validResults.reduce((s, r) => s + r.totalScore, 0) / validResults.length,
        )
      : 0;

  const dist: Record<ProductivityLevel, number> = {
    beginner: 0,
    practitioner: 0,
    advanced: 0,
    champion: 0,
  };
  for (const r of validResults) {
    dist[r.level] = (dist[r.level] ?? 0) + 1;
  }

  return {
    average,
    distribution: dist,
    participants: validResults.length,
    scores: validResults.map((r) => ({
      userId: r.userId,
      totalScore: r.totalScore,
      level: r.level,
    })),
  };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Get productivity score for a specific student in a course.
 * Actor must have access to the student's data (own, curator, instructor, admin).
 */
export async function getProductivityScore(
  actor: AppSessionUser,
  targetUserId: string,
  courseId: string,
): Promise<ProductivityScoreResult> {
  // Own data — always allowed
  if (actor.id === targetUserId) {
    return calculateForUser(targetUserId, courseId);
  }

  // Admin — full access
  if (actor.roles.includes("admin" as PrismaRoleKey)) {
    return calculateForUser(targetUserId, courseId);
  }

  // Instructor — their courses only
  if (actor.roles.includes("instructor" as PrismaRoleKey)) {
    const instr = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: actor.id } },
    });
    if (instr) return calculateForUser(targetUserId, courseId);
  }

  // Curator — assigned students only
  if (actor.roles.includes("curator" as PrismaRoleKey)) {
    const assignment = await prisma.curatorAssignment.findFirst({
      where: { curatorId: actor.id, studentId: targetUserId, active: true },
    });
    if (assignment) return calculateForUser(targetUserId, courseId);
  }

  // Super curator — students in their super_curator scope
  if (actor.roles.includes("super_curator" as PrismaRoleKey)) {
    const scope = await getSuperCuratorScope({
      id: actor.id,
      roles: actor.roles as string[],
    });
    if (scope.studentIds.includes(targetUserId)) {
      return calculateForUser(targetUserId, courseId);
    }
  }

  // Customer observer — only if seeing this cohort's data
  if (actor.roles.includes("customer_observer" as PrismaRoleKey)) {
    const observedIds = await getScopedStudentIdsForObserver(actor.id);
    if (observedIds && observedIds.includes(targetUserId)) {
      return calculateForUser(targetUserId, courseId);
    }
  }

  throw new ApiError("forbidden", "Нет доступа к данным этого слушателя", 403);
}

/**
 * Get productivity score summary for a cohort.
 * Actor must have cohort access.
 */
export async function getCohortProductivity(
  actor: AppSessionUser,
  cohortId: string,
): Promise<CohortScoreSummary> {
  return calculateForCohort(cohortId, actor);
}

// ── Internal helpers ──────────────────────────────────────────────────

async function assertCohortAccess(actor: AppSessionUser, cohortId: string): Promise<void> {
  const roles = actor.roles;

  if (roles.includes("admin" as PrismaRoleKey)) return;

  if (roles.includes("super_curator" as PrismaRoleKey)) {
    const scope = await getSuperCuratorScope({
      id: actor.id,
      roles: actor.roles as string[],
    });
    if (scope.cohortIds.includes(cohortId)) return;
  }

  if (
    roles.includes("curator" as PrismaRoleKey) ||
    roles.includes("instructor" as PrismaRoleKey)
  ) {
    // Curator/instructor scoped via enrollment relationship
    const hasAccess = await prisma.enrollment.findFirst({
      where: { cohortId },
      select: { id: true },
    });
    if (hasAccess) return;
  }

  if (roles.includes("customer_observer" as PrismaRoleKey)) {
    const scope = await getObserverScope(actor.id);
    if (scope.cohortIds.includes(cohortId)) return;
  }

  throw new ApiError("forbidden", "Нет доступа к данным этого потока", 403);
}
