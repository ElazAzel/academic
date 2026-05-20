import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getProfile, updateProfile } from "@/server/modules/auth/service";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getProfile(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, profileSchema);
    await updateProfile(user.id, body);
    return ok(await getProfile(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

