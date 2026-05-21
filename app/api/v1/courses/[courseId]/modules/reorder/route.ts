import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { reorderModules } from "@/server/modules/course-builder/service";
import { z } from "zod";

type Context = { params: Promise<{ courseId: string }> };

const reorderSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
});

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const { moduleIds } = await parseJson(request, reorderSchema);
    return ok(await reorderModules(courseId, moduleIds, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
