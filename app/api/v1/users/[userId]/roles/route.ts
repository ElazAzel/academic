import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { roleAssignmentSchema } from "@/lib/validation";
import { setUserRoles } from "@/server/modules/users/service";

type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser("roles:manage");
    const input = await parseJson(request, roleAssignmentSchema);
    const { userId } = await context.params;
    return ok(await setUserRoles(actor, userId, input.roles));
  } catch (error) {
    return errorResponse(error);
  }
}
