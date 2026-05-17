import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { courseBuilderSnapshotSchema } from "@/lib/validation";
import { saveCourseBuilderSnapshot } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ courseId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const input = await parseJson(request, courseBuilderSnapshotSchema);
    return ok(await saveCourseBuilderSnapshot(courseId, input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
