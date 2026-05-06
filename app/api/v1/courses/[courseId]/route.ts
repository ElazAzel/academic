import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateCourseSchema } from "@/lib/validation";
import { getCourse, updateCourse } from "@/server/modules/courses/service";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser("courses:read");
    const { courseId } = await context.params;
    return ok(await getCourse(courseId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const input = await parseJson(request, updateCourseSchema);
    return ok(await updateCourse(courseId, input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

