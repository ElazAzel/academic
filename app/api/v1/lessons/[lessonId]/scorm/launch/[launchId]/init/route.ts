import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { initLaunch } from "@/server/modules/scorm/cmi-service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const result = await initLaunch(launchId, user.id);
    return ok({ status: result.status });
  } catch (error) {
    return errorResponse(error);
  }
}
