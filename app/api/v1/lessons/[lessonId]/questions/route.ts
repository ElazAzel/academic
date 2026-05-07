import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { lessonQuestionSchema } from "@/lib/validation";
import { askCuratorQuestion } from "@/server/modules/learning/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("progress:write");
    const input = await parseJson(request, lessonQuestionSchema);
    const { lessonId } = await context.params;
    return ok(await askCuratorQuestion(user.id, lessonId, input.text), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
