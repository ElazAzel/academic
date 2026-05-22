import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getCourseAttendance } from "@/server/actions/attendance";

type Context = { params: Promise<{ courseId: string }> };

/**
 * GET /api/v1/courses/:courseId/attendance
 *
 * Возвращает посещаемость всех уроков курса.
 */
export async function GET(request: Request, context: Context) {
  try {
    await requireUser("courses:read");
    const { courseId } = await context.params;
    return ok(await getCourseAttendance(courseId));
  } catch (error) {
    return errorResponse(error);
  }
}
