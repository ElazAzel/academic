import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getLessonAttendanceDetail } from "@/server/actions/attendance";

type Context = { params: Promise<{ lessonId: string }> };

/**
 * GET /api/v1/lessons/:lessonId/attendance
 *
 * Возвращает детальную посещаемость студентов по уроку.
 */
export async function GET(request: Request, context: Context) {
  try {
    await requireUser("courses:read");
    const { lessonId } = await context.params;
    return ok(await getLessonAttendanceDetail(lessonId));
  } catch (error) {
    return errorResponse(error);
  }
}
