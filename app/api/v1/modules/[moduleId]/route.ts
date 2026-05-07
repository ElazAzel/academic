import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { moduleSchema } from "@/lib/validation";
import { updateModule, deleteModule } from "@/server/modules/courses/service";
import { z } from "zod";

type Context = { params: Promise<{ moduleId: string }> };

const updateModuleSchema = moduleSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional()
});

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { moduleId } = await context.params;
    const input = await parseJson(request, updateModuleSchema);
    return ok(await updateModule(moduleId, input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { moduleId } = await context.params;
    return ok(await deleteModule(moduleId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
