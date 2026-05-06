import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { moduleSchema } from "@/lib/validation";
import { createModule } from "@/server/modules/courses/service";

type Context = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const input = await parseJson(request, moduleSchema);
    return created(await createModule(courseId, { ...input, recommendedDays: input.recommendedDays ?? 7 }, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
