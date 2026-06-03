"use server";

import { EnrollmentStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { ApiError, getSafeErrorMetadata } from "@/lib/http";
import type { CourseAccessActor } from "@/server/modules/courses/access";

const XP_LESSON_COMPLETE = 50;
const XP_QUIZ_PASS = 30;
const XP_QUIZ_FAIL = 5;
const XP_ASSIGNMENT_SUBMIT = 40;

export type XpAction = "lesson_complete" | "quiz_pass" | "quiz_attempt" | "assignment_submit";

function rethrowSafeXpError(error: unknown, label: string, message: string): never {
  if (error instanceof ApiError) {
    throw error;
  }

  console.error(label, getSafeErrorMetadata(error));
  throw new ApiError("internal_error", message, 500);
}

/**
 * Начислить XP пользователю и вернуть текущий баланс.
 */
const AwardXpSchema = z.object({
  userId: z.string().min(1, "ID пользователя обязателен"),
  action: z.enum(["lesson_complete", "quiz_pass", "quiz_attempt", "assignment_submit"]),
});

export async function awardXp(userId: string, action: XpAction): Promise<{ xp: number; earned: number }> {
  try {
    const parsed = AwardXpSchema.safeParse({ userId, action });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const earned = getXpForAction(action);
    if (earned === 0) return { xp: 0, earned: 0 };

    const user = await getPrisma().user.update({
      where: { id: userId },
      data: { xp: { increment: earned } },
      select: { xp: true },
    });

    return { xp: user.xp, earned };
  } catch (error) {
    rethrowSafeXpError(error, "[awardXp]", "Не удалось начислить XP");
  }
}

function getXpForAction(action: XpAction): number {
  switch (action) {
    case "lesson_complete":
      return XP_LESSON_COMPLETE;
    case "quiz_pass":
      return XP_QUIZ_PASS;
    case "quiz_attempt":
      return XP_QUIZ_FAIL;
    case "assignment_submit":
      return XP_ASSIGNMENT_SUBMIT;
  }
}

const GetUserXpSchema = z.object({
  userId: z.string().min(1, "ID пользователя обязателен"),
});

/**
 * Получить XP пользователя.
 */
export async function getUserXp(userId: string): Promise<number> {
  try {
    const parsed = GetUserXpSchema.safeParse({ userId });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    return user?.xp ?? 0;
  } catch (error) {
    rethrowSafeXpError(error, "[getUserXp]", "Не удалось получить XP пользователя");
  }
}

/**
 * Получить топ пользователей по XP (leaderboard).
 */
export async function getLeaderboard(limit = 10) {
  try {
    return await getPrisma().user.findMany({
      where: { xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: limit,
      select: { id: true, name: true, xp: true },
    });
  } catch (error) {
    rethrowSafeXpError(error, "[getLeaderboard]", "Не удалось получить рейтинг XP");
  }
}

function hasRole(actor: CourseAccessActor, role: string) {
  return actor.roles.includes(role as CourseAccessActor["roles"][number]);
}

function leaderboardVisibilityWhere(actor: CourseAccessActor): Prisma.UserWhereInput {
  if (hasRole(actor, "admin")) {
    return {};
  }

  const OR: Prisma.UserWhereInput[] = [];

  if (hasRole(actor, "student")) {
    OR.push({
      enrollments: {
        some: {
          status: EnrollmentStatus.ACTIVE,
          OR: [
            {
              cohort: {
                is: {
                  enrollments: {
                    some: {
                      userId: actor.id,
                      status: EnrollmentStatus.ACTIVE,
                    },
                  },
                },
              },
            },
            {
              cohortId: null,
              course: {
                enrollments: {
                  some: {
                    userId: actor.id,
                    status: EnrollmentStatus.ACTIVE,
                    cohortId: null,
                  },
                },
              },
            },
          ],
        },
      },
    });
  }

  if (hasRole(actor, "instructor")) {
    OR.push({
      enrollments: {
        some: {
          status: EnrollmentStatus.ACTIVE,
          course: {
            instructors: {
              some: { userId: actor.id },
            },
          },
        },
      },
    });
  }

  if (hasRole(actor, "curator")) {
    OR.push({
      curatorAssignments: {
        some: {
          curatorId: actor.id,
          active: true,
        },
      },
    });
  }

  if (hasRole(actor, "super_curator")) {
    OR.push({
      curatorAssignments: {
        some: {
          superCuratorId: actor.id,
          active: true,
        },
      },
    });
  }

  if (hasRole(actor, "customer_observer")) {
    OR.push({
      enrollments: {
        some: {
          status: EnrollmentStatus.ACTIVE,
          cohort: {
            is: {
              OR: [
                { observerCohorts: { some: { userId: actor.id } } },
                {
                  project: {
                    is: {
                      observerProjects: {
                        some: { userId: actor.id },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
  }

  return OR.length > 0 ? { OR } : { id: "__no_leaderboard_access__" };
}

export async function getLeaderboardForActor(actor: CourseAccessActor, limit = 10) {
  try {
    return await getPrisma().user.findMany({
      where: {
        xp: { gt: 0 },
        ...leaderboardVisibilityWhere(actor),
      },
      orderBy: { xp: "desc" },
      take: limit,
      select: { id: true, name: true, xp: true },
    });
  } catch (error) {
    rethrowSafeXpError(error, "[getLeaderboardForActor]", "Не удалось получить рейтинг XP");
  }
}

