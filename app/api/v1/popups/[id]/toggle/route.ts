import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { togglePopupStatus, deletePopup, listPopups } from "@/server/modules/popups/service";

// POST /api/v1/popups/:id/toggle — toggle active status (admin only)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("settings:manage");
    const { id } = await params;

    const popups = await listPopups(true);
    const popup = popups.find((p) => p.id === id);
    if (!popup) {
      return errorResponse(Object.assign(new Error("Попап не найден"), { code: "not_found", status: 404 }));
    }

    const updated = await togglePopupStatus(id, !popup.isActive);
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/v1/popups/:id — delete popup (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser("settings:manage");
    const { id } = await params;
    await deletePopup(id);
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
