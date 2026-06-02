import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/http";
import { updateCourseSchema } from "@/lib/validation";
import { getCourse, updateCourse } from "@/server/modules/courses/service";
import { assertCourseReadAccess } from "@/server/modules/courses/access";

type Context = { params: Promise<{ courseId: string }> };

const UNPUBLISHED_READER_ROLES = new Set(["admin", "super_curator", "curator", "instructor"]);

function canReadUnpublishedCourse(roles: string[]) {
  return roles.some((role) => UNPUBLISHED_READER_ROLES.has(role));
}

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { courseId } = await context.params;
    const course = await getCourse(courseId);
    await assertCourseReadAccess(user, courseId);

    if (course.status !== "PUBLISHED") {
      if (canReadUnpublishedCourse(user.roles)) {
        return ok(course);
      }
      throw new ApiError("not_found", "Курс не найден", 404);
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

