import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listNotifications, markAllNotificationsAsRead } from "@/server/modules/notifications/service";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listNotifications(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, z.object({
      action: z.enum(["markAllRead", "markRead"]),
      id: z.string().optional(),
    }));

    if (body.action === "markAllRead") {
      await markAllNotificationsAsRead(user.id);
    }

    return ok(await listNotifications(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

