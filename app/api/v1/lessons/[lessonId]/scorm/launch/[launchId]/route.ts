import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateScormLaunch } from "@/server/modules/scorm/service";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const body = await request.json() as Record<string, unknown>;

    const result = await updateScormLaunch(launchId, user.id, body);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
