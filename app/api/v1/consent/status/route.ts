import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { hasUserConsented } from "@/server/modules/consent/service";

export async function GET() {
  try {
    const user = await requireUser();
    const consented = await hasUserConsented(user.id);
    return ok({ consented });
  } catch (error) {
    return errorResponse(error);
  }
}
