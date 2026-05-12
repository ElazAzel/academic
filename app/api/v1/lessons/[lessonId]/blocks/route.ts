import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateLessonBlocks } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const { blocks } = await request.json();
    return ok(await updateLessonBlocks(lessonId, blocks, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
