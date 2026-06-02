import type { Prisma } from "@prisma/client";
import { EnrollmentStatus } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import type { AppSessionUser } from "@/types/domain";

const prisma = getPrisma();

export type CourseAccessActor = Pick<AppSessionUser, "id" | "roles">;
const COURSE_ANALYTICS_ROLES = new Set(["admin", "instructor", "curator", "super_curator", "customer_observer"]);

function hasRole(actor: CourseAccessActor, role: string) {
  return actor.roles.includes(role as CourseAccessActor["roles"][number]);
}

export function isGlobalCourseReader(actor: CourseAccessActor) {
  return hasRole(actor, "admin");
}

export function courseReadWhereForActor(actor: CourseAccessActor): Prisma.CourseWhereInput {
  if (isGlobalCourseReader(actor)) {
    return {};
  }

  const or: Prisma.CourseWhereInput[] = [];

  if (hasRole(actor, "student")) {
    or.push({
      enrollments: {
        some: {
          userId: actor.id,
          status: EnrollmentStatus.ACTIVE,
        },
      },
    });
  }

  if (hasRole(actor, "instructor")) {
    or.push({
      instructors: {
        some: { userId: actor.id },
      },
    });
  }

  if (hasRole(actor, "curator")) {
    or.push({
      enrollments: {
        some: {
          status: EnrollmentStatus.ACTIVE,
          user: {
            curatorAssignments: {
              some: {
                curatorId: actor.id,
                active: true,
              },
            },
          },
        },
      },
    });
  }

  if (hasRole(actor, "super_curator")) {
    or.push({
      enrollments: {
        some: {
          status: EnrollmentStatus.ACTIVE,
          user: {
            curatorAssignments: {
              some: {
                superCuratorId: actor.id,
                active: true,
              },
            },
          },
        },
      },
    });
  }

  if (hasRole(actor, "customer_observer")) {
    or.push({
      cohorts: {
        some: {
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
    });
  }

  return or.length > 0 ? { OR: or } : { id: "__no_course_access__" };
}

export function quizReadWhereForActor(actor: CourseAccessActor): Prisma.QuizWhereInput {
  if (isGlobalCourseReader(actor)) {
    return {};
  }

  const courseWhere = courseReadWhereForActor(actor);

  return {
    OR: [
      { course: { is: courseWhere } },
      {
        lesson: {
          is: {
            module: {
              course: courseWhere,
            },
          },
        },
      },
    ],
  };
}

export async function assertCourseReadAccess(actor: CourseAccessActor, courseId: string) {
  if (isGlobalCourseReader(actor)) {
    return;
  }

  const allowed = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...courseReadWhereForActor(actor),
    },
    select: { id: true },
  });

  if (!allowed) {
    throw new ApiError("forbidden", "Нет доступа к этому курсу", 403);
  }
}

export async function assertCourseAnalyticsAccess(actor: CourseAccessActor, courseId: string) {
  if (!actor.roles.some((role) => COURSE_ANALYTICS_ROLES.has(role))) {
    throw new ApiError("forbidden", "Нет доступа к аналитике курса", 403);
  }

  await assertCourseReadAccess(actor, courseId);
}

export async function assertLearningContentAccess(actor: CourseAccessActor, courseId: string) {
  if (hasRole(actor, "admin")) {
    return;
  }

  if (hasRole(actor, "instructor")) {
    const instructor = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: actor.id } },
      select: { courseId: true },
    });
    if (instructor) return;
  }

  if (hasRole(actor, "student")) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: actor.id, courseId } },
      select: { status: true },
    });
    if (enrollment?.status === EnrollmentStatus.ACTIVE) return;
  }

  if (hasRole(actor, "curator")) {
    const scopedEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
        user: {
          curatorAssignments: {
            some: { curatorId: actor.id, active: true },
          },
        },
      },
      select: { id: true },
    });
    if (scopedEnrollment) return;
  }

  if (hasRole(actor, "super_curator")) {
    const scopedEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
        user: {
          curatorAssignments: {
            some: { superCuratorId: actor.id, active: true },
          },
        },
      },
      select: { id: true },
    });
    if (scopedEnrollment) return;
  }

  throw new ApiError("forbidden", "Нет доступа к учебному контенту", 403);
}

export async function canReadCourseAnswerKeys(actor: CourseAccessActor, courseId: string) {
  if (hasRole(actor, "admin")) {
    return true;
  }

  if (!hasRole(actor, "instructor")) {
    return false;
  }

  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: actor.id } },
    select: { courseId: true },
  });

  return Boolean(instructor);
}
