import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { quizAttemptSchema } from "@/lib/validation";
import { submitQuizAttempt } from "@/server/modules/quizzes/service";

type Context = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("progress:write");
    const { quizId } = await context.params;
    const input = await parseJson(request, quizAttemptSchema);
    return created(await submitQuizAttempt(quizId, user.id, input.answers));
  } catch (error) {
    return errorResponse(error);
  }
}

