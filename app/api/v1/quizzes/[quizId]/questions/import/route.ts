import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importQuestions } from "@/server/modules/quizzes/service";
import { z } from "zod";

type Context = { params: Promise<{ quizId: string }> };

const importSchema = z.object({
  questionIds: z.array(z.string()).min(1),
});

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { quizId } = await context.params;
    const { questionIds } = await parseJson(request, importSchema);
    return ok(await importQuestions(quizId, questionIds, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
