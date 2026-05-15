import { z } from "zod";
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { acknowledgePopup } from "@/server/modules/popups/service";

const acknowledgeSchema = z.object({
  popupId: z.string().min(1, "ID попапа обязателен"),
});

// POST /api/v1/popups/acknowledge — mark popup as viewed for current user
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, acknowledgeSchema);
    await acknowledgePopup(body.popupId, user.id);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
