import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { courseBuilderSettingsSchema } from "@/lib/validation";
import { getCourseForBuilder, updateCourseSettings } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { courseId } = await context.params;
    return ok(await getCourseForBuilder(courseId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const input = await parseJson(request, courseBuilderSettingsSchema);
    return ok(await updateCourseSettings(courseId, input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
