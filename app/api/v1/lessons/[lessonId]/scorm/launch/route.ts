import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getScormPackage, createScormLaunch } from "@/server/modules/scorm/service";

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

    const pkg = await getScormPackage(lessonId);
    if (!pkg) {
      return ok({ error: "SCORM-пакет не найден" }, 404);
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
