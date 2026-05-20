import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { publishCourseFromBuilder } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ courseId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    return ok(await publishCourseFromBuilder(courseId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
