import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { cloneModule } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ moduleId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { moduleId } = await context.params;
    return ok(await cloneModule(moduleId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
