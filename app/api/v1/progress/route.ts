import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { progressSchema } from "@/lib/validation";
import { getProgressSnapshot, markLessonProgress } from "@/server/modules/progress/service";
import { awardXp } from "@/server/actions/xp";
import { checkAndAward } from "@/server/modules/gamification/achievements";
import { recordStreakActivity } from "@/server/modules/gamification/streak";

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
    const result = await markLessonProgress(user.id, input.lessonId, input.percent);

    // Gamification: начисляем XP за завершение урока
    const lessonCompleted = result.lessonProgress.status === "COMPLETED";
    let xpResult = null;
    if (lessonCompleted) {
      xpResult = await awardXp(user.id, "lesson_complete");
      await recordStreakActivity(user.id);
      await checkAndAward(user.id, "lesson_complete");
    }

    return ok({ ...result, xp: xpResult });
  } catch (error) {
    return errorResponse(error);
  }
}

