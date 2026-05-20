import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { lessonBlocksSchema } from "@/lib/validation";
import type { ContentBlock } from "@/types/domain";
import { updateLessonBlocks } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const { blocks } = await parseJson(request, lessonBlocksSchema);
    return ok(await updateLessonBlocks(lessonId, blocks as ContentBlock[], user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
