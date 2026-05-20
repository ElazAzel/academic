import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getLatestUnviewedPopup } from "@/server/modules/popups/service";

// GET /api/v1/popups/active — get the latest unviewed popup for current user
export async function GET() {
  try {
    const user = await requireUser();
    const popup = await getLatestUnviewedPopup(user.id);
    return ok(popup);
  } catch (error) {
    console.error("[popups/active] Error:", error);
    return errorResponse(error);
  }
}
