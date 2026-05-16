import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { quizAttemptSchema } from "@/lib/validation";
import { submitQuizAttempt } from "@/server/modules/quizzes/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError } from "@/lib/http";

type Context = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("progress:write");
    const skipLimit = user.roles.includes("instructor") || user.roles.includes("admin") || user.roles.includes("super_curator") || user.roles.includes("curator");

    const rl = await checkRateLimit(`quiz-attempt:${user.id}`);
    if (!rl.allowed) {
      return errorResponse(new ApiError("too_many_requests", "Слишком много попыток. Подождите.", 429));
    }

    const { quizId } = await context.params;
    const input = await parseJson(request, quizAttemptSchema);
    return created(await submitQuizAttempt(quizId, user.id, input.answers, skipLimit));
  } catch (error) {
    return errorResponse(error);
  }
}

