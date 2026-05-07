import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getDefaultRolePath } from "@/lib/auth/role-redirect";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ path: getDefaultRolePath(user.roles) });
  } catch (error) {
    return errorResponse(error);
  }
}
