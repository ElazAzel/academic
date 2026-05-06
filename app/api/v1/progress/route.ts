import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { progressSchema } from "@/lib/validation";
import { getProgressSnapshot, markLessonProgress } from "@/server/modules/progress/service";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getProgressSnapshot(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser("progress:write");
    const input = await parseJson(request, progressSchema);
    return ok(await markLessonProgress(user.id, input.lessonId, input.percent));
  } catch (error) {
    return errorResponse(error);
  }
}

