import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { lessonSchema } from "@/lib/validation";
import { createLesson } from "@/server/modules/courses/service";

type Context = { params: Promise<{ moduleId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("lessons:write");
    const { moduleId } = await context.params;
    const input = await parseJson(request, lessonSchema);
    return created(await createLesson(
      moduleId,
      {
        ...input,
        type: input.type ?? "MIXED",
        content: input.content ?? {},
        durationMinutes: input.durationMinutes ?? 0
      },
      user.id
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
