import { z } from "zod";
import { errorResponse, ok, created, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/rbac";
import type { RoleKey } from "@/types/domain";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();
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
  targetRoles: z.array(z.string()).optional().default([]),
  targetCohortIds: z.array(z.string()).optional().default([]),
  targetUserIds: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => data.targetRoles.length > 0 || data.targetUserIds.length > 0,
  { message: "Нужно указать целевые роли или конкретных пользователей" },
);

// GET /api/v1/popups — list all popups (admin only)
export async function GET() {
  try {
    const user = await requireUser();
    assertPermission(user.roles, "notifications:write");
    const popups = await listPopups(
      true,
      user.roles.includes("admin" as RoleKey) ? undefined : { createdById: user.id },
    );
    return ok(popups);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/v1/popups — create a new popup (admin or curator for own students)
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertPermission(user.roles, "notifications:write");
    const body = await parseJson(request, createPopupSchema);

    const targetUserIds = body.targetUserIds ?? [];
    const targetRoles = body.targetRoles ?? [];
    const targetCohortIds = body.targetCohortIds ?? [];
    const isAdmin = user.roles.includes("admin" as RoleKey);

    if (!isAdmin && (targetRoles.length > 0 || targetCohortIds.length > 0)) {
      throw new ApiError("forbidden", "Только администратор может отправлять попапы по ролям или потокам", 403);
    }

    // If curator creates popup for specific students, verify they're assigned to them
    if (targetUserIds.length > 0 && !user.roles.includes("admin" as RoleKey)) {
      const assignedStudents = await prisma.curatorAssignment.findMany({
        where: {
          curatorId: user.id,
          active: true,
          studentId: { in: targetUserIds },
        },
        select: { studentId: true },
      });
      const assignedIds = new Set(assignedStudents.map((a) => a.studentId));
      const unauthorized = targetUserIds.filter((id) => !assignedIds.has(id));
      if (unauthorized.length > 0) {
        throw new ApiError("forbidden", "Вы можете создавать попапы только для своих слушателей", 403);
      }
    }

    const popup = await createPopup(
      {
        title: body.title,
        message: body.message,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        linkText: body.linkText,
        targetRoles: targetRoles as RoleKey[],
        targetCohortIds,
        targetUserIds: targetUserIds,
        isActive: body.isActive,
      },
      user.id
    );
    return created(popup);
  } catch (error) {
    return errorResponse(error);
  }
}
