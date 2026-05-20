import { CourseStatus } from "@prisma/client";
import { created, errorResponse, getSearchParam, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { courseSchema } from "@/lib/validation";
import { createCourse, listCourses } from "@/server/modules/courses/service";
import { getObserverScope } from "@/server/modules/observer/scope";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function GET(request: Request) {
  try {
    const user = await requireUser("courses:read");
    const rawStatus = getSearchParam(request, "status");
    const status = rawStatus && rawStatus in CourseStatus ? CourseStatus[rawStatus as keyof typeof CourseStatus] : undefined;

    // customer_observer: только курсы из их когорт/проектов
    if (user.roles.includes("customer_observer")) {
      const scope = await getObserverScope(user.id);
      if (scope.cohortIds.length === 0) {
        return ok([]);
      }
      const cohortCourses = await prisma.cohort.findMany({
        where: { id: { in: scope.cohortIds } },
        select: { courseId: true },
      });
      const courseIds = Array.from(new Set(cohortCourses.map((c) => c.courseId).filter((id): id is string => id !== null)));
      if (courseIds.length === 0) {
        return ok([]);
      }
      return ok(await listCourses(status, undefined, courseIds));
    }

    return ok(await listCourses(status));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:write");
    const input = await parseJson(request, courseSchema);
    return created(await createCourse(
      {
        ...input,
        durationHours: input.durationHours ?? 0,
        traversalMode: input.traversalMode ?? "sequential"
      },
      user.id,
      user.roles
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
