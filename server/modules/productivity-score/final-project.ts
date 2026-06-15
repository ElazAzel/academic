import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import type { AppSessionUser } from "@/types/domain";
import type { RoleKey as PrismaRoleKey } from "@prisma/client";

// ── Zod schemas ───────────────────────────────────────────────────────

export const rubricCriterionSchema = z.object({
  /** 1–6, matches the rubric */
  criterionNumber: z.number().int().min(1).max(6),
  /** Short label: "Задача относится к работе", "Состояние до/после", etc. */
  label: z.string().min(1).max(200),
  /** Points awarded by curator */
  score: z.number().int().min(0),
  /** Maximum possible points for this criterion */
  maxScore: z.number().int().min(1),
  /** Optional curator comment per criterion */
  comment: z.string().max(1000).optional(),
});

export const finalProjectRubricSchema = z.object({
  /** All 6 rubric criteria */
  criteria: z.array(rubricCriterionSchema).length(6),
  /** Auto-calculated total score (0–100) */
  totalScore: z.number().int().min(0).max(100),
  /** Auto-calculated level */
  level: z.enum(["beginner", "practitioner", "advanced", "champion"]),
  /** Overall curator comment */
  curatorComment: z.string().max(2000).optional(),
  /** Recommendation for the student */
  recommendation: z.string().max(2000).optional(),
  /** When the rubric was last saved */
  savedAt: z.string().datetime().optional(),
  /** Who saved the rubric */
  savedByUserId: z.string().optional(),
});

export type FinalProjectRubric = z.infer<typeof finalProjectRubricSchema>;

// ── Level resolver ────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: { min: number; level: FinalProjectRubric["level"] }[] = [
  { min: 90, level: "champion" },
  { min: 70, level: "advanced" },
  { min: 40, level: "practitioner" },
  { min: 0, level: "beginner" },
];

function resolveLevel(score: number): FinalProjectRubric["level"] {
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.min) return t.level;
  }
  return "beginner";
}

// ── Helpers ───────────────────────────────────────────────────────────

const prisma = getPrisma();

const RUBRIC_CRITERIA_LABELS: Record<number, { label: string; maxScore: number }> = {
  1: { label: "Задача реально относится к работе участника", maxScore: 20 },
  2: { label: "Описано состояние «до» и «после»", maxScore: 20 },
  3: { label: "AI применён осмысленно", maxScore: 20 },
  4: { label: "Есть готовый артефакт", maxScore: 20 },
  5: { label: "Есть оценка экономии времени", maxScore: 10 },
  6: { label: "Решение можно повторно использовать", maxScore: 10 },
};

/**
 * Build a rubric from raw per-criterion scores.
 * Auto-calculates total and level.
 */
export function buildRubric(
  scores: [number, number, number, number, number, number],
  overrides?: {
    curatorComment?: string;
    recommendation?: string;
    savedByUserId?: string;
  },
): FinalProjectRubric {
  const criteria = scores.map((score, idx) => {
    const num = idx + 1;
    const info = RUBRIC_CRITERIA_LABELS[num];
    return {
      criterionNumber: num,
      label: info.label,
      score: Math.min(score, info.maxScore),
      maxScore: info.maxScore,
    };
  });

  const totalScore = criteria.reduce((s, c) => s + c.score, 0);

  return {
    criteria,
    totalScore,
    level: resolveLevel(totalScore),
    ...(overrides?.curatorComment ? { curatorComment: overrides.curatorComment } : {}),
    ...(overrides?.recommendation ? { recommendation: overrides.recommendation } : {}),
    savedAt: new Date().toISOString(),
    ...(overrides?.savedByUserId ? { savedByUserId: overrides.savedByUserId } : {}),
  };
}

// ── RBAC guard ────────────────────────────────────────────────────────

async function assertCanGradeSubmission(
  actor: AppSessionUser,
  submissionId: string,
): Promise<void> {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    select: {
      assignment: {
        select: { courseId: true },
      },
    },
  });

  if (!submission) {
    throw new ApiError("not_found", "Работа не найдена", 404);
  }

  const courseId = submission.assignment.courseId;
  if (!courseId) {
    throw new ApiError(
      "bad_request",
      "Задание не привязано к курсу",
      400,
    );
  }

  // Admin — full access
  if (actor.roles.includes("admin" as PrismaRoleKey)) return;

  // Instructor — their courses only
  if (actor.roles.includes("instructor" as PrismaRoleKey)) {
    const instr = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: actor.id } },
    });
    if (instr) return;
  }

  // Curator — assigned students only (check via submission's user)
  if (actor.roles.includes("curator" as PrismaRoleKey)) {
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: { userId: true },
    });
    if (sub) {
      const assignment = await prisma.curatorAssignment.findFirst({
        where: { curatorId: actor.id, studentId: sub.userId, active: true },
      });
      if (assignment) return;
    }
  }

  throw new ApiError("forbidden", "Нет права оценивать эту работу", 403);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Save a final project rubric to AssignmentSubmission.metadata.
 * Only admins, instructors (of the course), and curators (assigned to the student) may grade.
 */
export async function saveFinalProjectRubric(
  actor: AppSessionUser,
  submissionId: string,
  rubric: FinalProjectRubric,
): Promise<void> {
  // Validate with Zod
  const parsed = finalProjectRubricSchema.parse(rubric);

  // RBAC
  await assertCanGradeSubmission(actor, submissionId);

  // Save to metadata
  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      metadata: JSON.parse(JSON.stringify(parsed)),
      // Also sync the total score to the main score field
      score: parsed.totalScore,
      feedback: parsed.curatorComment ?? null,
    },
  });
}

/**
 * Read the final project rubric from a submission's metadata.
 * Any authenticated actor with access to the submission can read it.
 */
export async function getFinalProjectRubric(
  actor: AppSessionUser,
  submissionId: string,
): Promise<FinalProjectRubric | null> {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    select: { metadata: true, userId: true, assignment: { select: { courseId: true } } },
  });

  if (!submission) {
    throw new ApiError("not_found", "Работа не найдена", 404);
  }

  // RBAC: student can see only own, others need broader access
  if (actor.id !== submission.userId) {
    await assertCanGradeSubmission(actor, submissionId);
  }

  if (!submission.metadata) return null;

  // Parse with Zod — return null if invalid or not rubric-shaped
  const result = finalProjectRubricSchema.safeParse(submission.metadata);
  return result.success ? result.data : null;
}

/**
 * Build a fresh rubric from scores and save it atomically.
 * Convenience wrapper for curator grading UI.
 */
export async function gradeFinalProject(
  actor: AppSessionUser,
  submissionId: string,
  scores: [number, number, number, number, number, number],
  overrides?: {
    curatorComment?: string;
    recommendation?: string;
  },
): Promise<FinalProjectRubric> {
  const rubric = buildRubric(scores, {
    ...overrides,
    savedByUserId: actor.id,
  });

  await saveFinalProjectRubric(actor, submissionId, rubric);
  return rubric;
}
