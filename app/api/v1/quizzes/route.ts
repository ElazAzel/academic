import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listQuizzes } from "@/server/modules/quizzes/service";

export async function GET() {
  try {
    await requireUser("courses:read");
    return ok(await listQuizzes());
  } catch (error) {
    return errorResponse(error);
  }
}

