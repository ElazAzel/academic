import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { logVisibilityChange } from "@/server/modules/security/content-protection-server";
import { z } from "zod";

const schema = z.object({
  lessonId: z.string().min(1),
  state: z.enum(["hidden", "visible"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:read");
    const input = await parseJson(request, schema);

    await logVisibilityChange({
      userId: user.id,
      lessonId: input.lessonId,
      state: input.state,
    });

    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
