import type { Prisma } from "@prisma/client";
import { EnrollmentStatus } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import type { AppSessionUser } from "@/types/domain";

const prisma = getPrisma();

export type CourseAccessActor = Pick<AppSessionUser, "id" | "roles">;

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
