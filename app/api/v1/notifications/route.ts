import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/server/modules/notifications/service";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listNotifications(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

