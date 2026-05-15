import { z } from "zod";
import { errorResponse, ok, created, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/rbac";
import {
  createPopup,
  listPopups,
} from "@/server/modules/popups/service";

const createPopupSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  message: z.string().min(1, "Текст сообщения обязателен"),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkText: z.string().nullable().optional(),
  targetRoles: z.array(z.string()).min(1, "Нужно выбрать хотя бы одну роль"),
  targetCohortIds: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

// GET /api/v1/popups — list all popups (admin only)
export async function GET() {
  try {
    const user = await requireUser();
    assertPermission(user.roles, "notifications:write");
    const popups = await listPopups(true);
    return ok(popups);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/v1/popups — create a new popup (admin only)
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(user.roles, "notifications:write");
    const body = await parseJson(request, createPopupSchema);
    const popup = await createPopup(
      {
        title: body.title,
        message: body.message,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        linkText: body.linkText,
        targetRoles: body.targetRoles as any,
        targetCohortIds: body.targetCohortIds,
        isActive: body.isActive,
      },
      user.id
    );
    return created(popup);
  } catch (error) {
    return errorResponse(error);
  }
}
