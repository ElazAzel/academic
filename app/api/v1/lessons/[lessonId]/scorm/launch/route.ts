import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import {
  assertScormRuntimeAccess,
  createScormLaunch,
  getScormLessonCourseId,
  getScormPackage,
} from "@/server/modules/scorm/service";

type Context = { params: Promise<{ lessonId: string }> };

/**
 * POST /api/v1/lessons/:lessonId/scorm/launch
 *
 * Запускает SCORM-пакет урока — возвращает URL для iframe и ID запуска.
 */
export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;
    const courseId = await getScormLessonCourseId(lessonId);
    await assertScormRuntimeAccess(user, { lessonId, courseId });

    const pkg = await getScormPackage(lessonId);
    if (!pkg) {
      throw new ApiError("not_found", "SCORM-пакет не найден", 404);
    }

    const launch = await createScormLaunch(user.id, lessonId, pkg.id);

    return ok({
      launchId: launch.id,
      entryUrl: pkg.entryUrl,
      scormVersion: pkg.scormVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
