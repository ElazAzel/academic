import { z } from "zod";
import { NextResponse } from "next/server";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/server/modules/notifications/service";

export async function GET() {
  try {
    const user = await requireUser();
    const data = await listNotifications(user.id);
    const response = NextResponse.json({ data }, { status: 200 });
    response.headers.set("Cache-Control", "private, max-age=0, s-maxage=15, stale-while-revalidate=30");
    return response;
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
    } else if (body.action === "markRead" && body.id) {
      await markNotificationAsRead(body.id, user.id);
    }

    return ok(await listNotifications(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

