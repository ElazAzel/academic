import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/server/modules/auth/service";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getProfile(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

