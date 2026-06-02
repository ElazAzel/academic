import { ScormLaunchStatus } from "@prisma/client";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateScormLaunch } from "@/server/modules/scorm/service";
import { z } from "zod";

type Context = { params: Promise<{ lessonId: string; launchId: string }> };

const updateScormLaunchSchema = z.object({
  status: z.nativeEnum(ScormLaunchStatus).optional(),
  suspendData: z.string().optional(),
  score: z.coerce.number().finite().optional(),
  maxScore: z.coerce.number().finite().optional(),
  completion: z.string().optional(),
  success: z.string().optional(),
}).passthrough();

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { launchId } = await context.params;
    const body = await parseJson(request, updateScormLaunchSchema);

    const result = await updateScormLaunch(launchId, user.id, body);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
