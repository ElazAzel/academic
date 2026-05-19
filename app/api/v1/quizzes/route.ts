import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listQuizzes } from "@/server/modules/quizzes/service";

export async function GET() {
  try {
    const user = await requireUser("courses:read");
    return ok(await listQuizzes(user));
  } catch (error) {
    return errorResponse(error);
  }
}

