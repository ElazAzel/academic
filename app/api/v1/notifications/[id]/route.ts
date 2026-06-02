import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getNotificationById } from "@/server/modules/notifications/service";

// GET /api/v1/notifications/:id — get a single notification
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const notification = await getNotificationById(id, user.id);

    if (!notification) {
      return errorResponse(new ApiError("not_found", "Уведомление не найдено", 404));
    }

    return ok(notification);
  } catch (error) {
    return errorResponse(error);
  }
}
