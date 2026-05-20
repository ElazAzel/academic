import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/http";
import { updateCourseSchema } from "@/lib/validation";
import { getCourse, updateCourse } from "@/server/modules/courses/service";
import { getPrisma } from "@/lib/prisma";

type Context = { params: Promise<{ courseId: string }> };

const ELEVATED_ROLES = new Set(["admin", "super_curator", "curator", "instructor"]);

const prisma = getPrisma();

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { courseId } = await context.params;
    const isElevated = user.roles.some((r) => ELEVATED_ROLES.has(r));

    // Elevate-роли видят любой курс
    if (isElevated) {
      return ok(await getCourse(courseId));
    }

    // Студенты / наблюдатели — только PUBLISHED курсы, в которые зачислены
    const course = await getCourse(courseId);
    if (course.status !== "PUBLISHED") {
      throw new ApiError("not_found", "Курс не найден", 404);
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ApiError("forbidden", "Вы не зачислены на этот курс", 403);
    }

    return ok(course);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const input = await parseJson(request, updateCourseSchema);
    return ok(await updateCourse(courseId, input, user.id, user.roles));
  } catch (error) {
    return errorResponse(error);
  }
}

