import { created, errorResponse, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assignmentSubmissionSchema } from "@/lib/validation";
import { submitAssignment } from "@/server/modules/assignments/service";

type Context = { params: Promise<{ assignmentId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("progress:write");
    if (!user.roles.includes("student") && !user.roles.includes("admin")) {
      return errorResponse(new (await import("@/lib/http")).ApiError("forbidden", "Только слушатели могут отправлять задания", 403));
    }
    const { assignmentId } = await context.params;
    const input = await parseJson(request, assignmentSubmissionSchema);
    return created(await submitAssignment({ assignmentId, userId: user.id, ...input }));
  } catch (error) {
    return errorResponse(error);
  }
}

