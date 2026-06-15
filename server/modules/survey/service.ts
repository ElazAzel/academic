import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import type { AppSessionUser } from "@/types/domain";
import type { RoleKey as PrismaRoleKey } from "@prisma/client";

// ── Zod schemas ───────────────────────────────────────────────────────

export const courseSurveyDataSchema = z.object({
  /** Оценка удовлетворённости курсом 1–5 */
  satisfaction: z.number().min(1).max(5),
  /** Net Promoter Score 0–10 */
  nps: z.number().min(0).max(10),
  /** Полезность для работы 1–5 */
  usefulness: z.number().min(1).max(5),
  /** Применимость на практике 1–5 */
  applicability: z.number().min(1).max(5),
  /** Краткое описание автоматизации, которую участник внедрил */
  automationSummary: z.string().max(3000).optional(),
  /** Предложения по улучшению */
  improvementSuggestions: z.string().max(3000).optional(),
  /** Разрешить публиковать отзыв */
  publicComment: z.boolean().default(false),
  /** Текст отзыва для публикации */
  publicCommentText: z.string().max(2000).optional(),
});

export const submitSurveySchema = z.object({
  courseId: z.string().min(1),
  data: courseSurveyDataSchema,
});

export const surveyResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  courseId: z.string(),
  data: courseSurveyDataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CourseSurveyData = z.infer<typeof courseSurveyDataSchema>;
export type SurveyResponse = z.infer<typeof surveyResponseSchema>;

// ── RBAC ──────────────────────────────────────────────────────────────

async function assertCanAccessSurvey(
  actor: AppSessionUser,
  targetUserId: string,
  courseId: string,
): Promise<void> {
  // Own data
  if (actor.id === targetUserId) return;

  // Admin — full access
  if (actor.roles.includes("admin" as PrismaRoleKey)) return;

  // Instructor — their courses
  if (actor.roles.includes("instructor" as PrismaRoleKey)) {
    const instr = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: actor.id } },
    });
    if (instr) return;
  }

  // Curator — assigned students
  if (actor.roles.includes("curator" as PrismaRoleKey)) {
    const assignment = await prisma.curatorAssignment.findFirst({
      where: { curatorId: actor.id, studentId: targetUserId, active: true },
    });
    if (assignment) return;
  }

  // Super curator — in scope
  if (actor.roles.includes("super_curator" as PrismaRoleKey)) {
    const { getSuperCuratorScope } = await import(
      "@/server/modules/super-curator/scope"
    );
    const scope = await getSuperCuratorScope({
      id: actor.id,
      roles: actor.roles as string[],
    });
    if (scope.studentIds.includes(targetUserId)) return;
  }

  // Customer observer — in their scope
  if (actor.roles.includes("customer_observer" as PrismaRoleKey)) {
    const { getScopedStudentIdsForObserver } = await import(
      "@/server/modules/observer/scope"
    );
    const observedIds = await getScopedStudentIdsForObserver(actor.id);
    if (observedIds && observedIds.includes(targetUserId)) return;
  }

  throw new ApiError("forbidden", "Нет доступа к данным опроса", 403);
}

// ── Service ───────────────────────────────────────────────────────────

const prisma = getPrisma();

/**
 * Submit (or update) a post-course survey.
 * Student can submit only for themselves.
 */
export async function submitCourseSurvey(
  actor: AppSessionUser,
  courseId: string,
  data: CourseSurveyData,
): Promise<SurveyResponse> {
  // Validate
  const parsed = courseSurveyDataSchema.parse(data);

  // RBAC: only the student can submit their own survey
  // (admin/instructor can submit on behalf if needed — but not typical)
  if (actor.roles.includes("student" as PrismaRoleKey) && courseId) {
    // Student can only submit for themselves
  } else {
    await assertCanAccessSurvey(actor, actor.id, courseId);
  }

  // Check enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: actor.id, courseId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) {
    throw new ApiError(
      "forbidden",
      "Вы не зачислены на этот курс",
      403,
    );
  }

  // Upsert survey
  const survey = await prisma.courseSurvey.upsert({
    where: {
      userId_courseId: { userId: actor.id, courseId },
    },
    create: {
      userId: actor.id,
      courseId,
      data: JSON.parse(JSON.stringify(parsed)),
    },
    update: {
      data: JSON.parse(JSON.stringify(parsed)),
    },
  });

  return {
    id: survey.id,
    userId: survey.userId,
    courseId: survey.courseId,
    data: survey.data as unknown as CourseSurveyData,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  };
}

/**
 * Get survey response for a user in a course.
 */
export async function getCourseSurvey(
  actor: AppSessionUser,
  targetUserId: string,
  courseId: string,
): Promise<SurveyResponse | null> {
  await assertCanAccessSurvey(actor, targetUserId, courseId);

  const survey = await prisma.courseSurvey.findUnique({
    where: { userId_courseId: { userId: targetUserId, courseId } },
  });

  if (!survey) return null;

  return {
    id: survey.id,
    userId: survey.userId,
    courseId: survey.courseId,
    data: survey.data as unknown as CourseSurveyData,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  };
}

/**
 * Check if a user has completed the survey for a course.
 */
export async function hasCompletedSurvey(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const survey = await prisma.courseSurvey.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  return survey !== null;
}
