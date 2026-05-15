import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import { ApiError } from "@/lib/http";
import { createNotification } from "@/server/modules/notifications/service";
import type { RoleKey } from "@/types/domain";

const prisma = getPrisma();

export interface CreatePopupInput {
  title: string;
  message: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  targetRoles: RoleKey[];
  targetCohortIds?: string[];
  isActive?: boolean;
}

export interface PopupWithStatus {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  targetRoles: RoleKey[];
  targetCohortIds: string[];
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  viewed: boolean;
  viewedAt: Date | null;
}

/**
 * Create a new admin popup and send notifications to all users with target roles.
 */
export async function createPopup(input: CreatePopupInput, createdById: string) {
  const cohortIds = input.targetCohortIds ?? [];

  const popup = await prisma.adminPopup.create({
    data: {
      title: input.title,
      message: input.message,
      imageUrl: input.imageUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      linkText: input.linkText ?? null,
      targetRoles: JSON.stringify(input.targetRoles),
      targetCohortIds: JSON.stringify(cohortIds),
      isActive: input.isActive ?? true,
      createdById,
    },
  });

  // Create notification duplicates for all target users
  if (popup.isActive) {
    const hasStudentRole = input.targetRoles.includes("student" as RoleKey);
    const hasCohortFilter = cohortIds.length > 0;

    // Build query for target users
    const targetUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              key: { in: input.targetRoles },
            },
          },
        },
        ...(hasStudentRole && hasCohortFilter
          ? {
              enrollments: {
                some: {
                  cohortId: { in: cohortIds },
                  status: { in: ["ACTIVE", "INVITED"] },
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    for (const user of targetUsers) {
      await createNotification({
        userId: user.id,
        event: "popup" as any,
        title: input.title,
        body: input.message.length > 200 ? input.message.substring(0, 200) + "…" : input.message,
        data: {
          refType: "popup",
          refId: popup.id,
          link: `/notifications?popupId=${popup.id}`,
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl,
          linkText: input.linkText,
        },
      });
    }
  }

  return popup;
}

/**
 * Get active popups for a user (not yet viewed).
 * For students, checks cohort membership if popup has cohort restrictions.
 */
export async function getActivePopupsForUser(userId: string): Promise<PopupWithStatus[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        select: { role: { select: { key: true } } },
      },
      enrollments: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        select: { cohortId: true },
      },
    },
  });

  if (!user) return [];

  const userRoleKeys = user.roles.map((r) => r.role.key);
  const userCohortIds = user.enrollments.map((e) => e.cohortId).filter(Boolean) as string[];

  const popups = await prisma.adminPopup.findMany({
    where: {
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by target roles + cohort restrictions
  const filteredPopups = popups.filter((p) => {
    try {
      const roles: string[] = JSON.parse(p.targetRoles || "[]");
      if (roles.length === 0) return false;
      if (!roles.some((r) => userRoleKeys.includes(r as RoleKey))) return false;

      // If popup targets students AND has cohort restrictions, check cohort membership
      if (roles.includes("student")) {
        const cohortIds: string[] = JSON.parse(p.targetCohortIds || "[]");
        if (cohortIds.length > 0) {
          // User must be enrolled in one of the target cohorts
          return cohortIds.some((cid) => userCohortIds.includes(cid));
        }
      }

      return true;
    } catch {
      return false;
    }
  });

  // Get viewed status
  const popupIds = filteredPopups.map((p) => p.id);
  const views = await prisma.popupView.findMany({
    where: {
      popupId: { in: popupIds },
      userId,
    },
  });

  const viewedMap = new Map(views.map((v) => [v.popupId, v]));

  return filteredPopups.map((p) => {
    const view = viewedMap.get(p.id);
    return {
      ...p,
      targetRoles: JSON.parse(p.targetRoles),
      targetCohortIds: JSON.parse(p.targetCohortIds),
      viewed: !!view,
      viewedAt: view?.viewedAt ?? null,
    };
  });
}

/**
 * Get the latest unviewed popup for a user (to show once on platform load).
 */
export async function getLatestUnviewedPopup(userId: string) {
  const popups = await getActivePopupsForUser(userId);
  return popups.find((p) => !p.viewed) ?? null;
}

/**
 * Acknowledge (mark as viewed) a popup for a user.
 */
export async function acknowledgePopup(popupId: string, userId: string) {
  // Upsert popup view
  await prisma.popupView.upsert({
    where: {
      popupId_userId: {
        popupId,
        userId,
      },
    },
    update: {
      viewedAt: new Date(),
    },
    create: {
      popupId,
      userId,
    },
  });

  // Also mark the corresponding notification as read
  await prisma.notification.updateMany({
    where: {
      userId,
      refType: "popup",
      refId: popupId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
      status: "READ",
    },
  });

  return { success: true };
}

/**
 * List all popups (for admin management).
 */
export async function listPopups(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };
  const popups = await prisma.adminPopup.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return popups.map((p) => ({
    ...p,
    targetRoles: JSON.parse(p.targetRoles),
    targetCohortIds: JSON.parse(p.targetCohortIds),
  }));
}

/**
 * Toggle popup active status.
 */
export async function togglePopupStatus(popupId: string, isActive: boolean) {
  const popup = await prisma.adminPopup.findUnique({
    where: { id: popupId },
  });

  if (!popup) {
    throw new ApiError("not_found", "Попап не найден", 404);
  }

  return prisma.adminPopup.update({
    where: { id: popupId },
    data: { isActive },
  });
}

/**
 * Delete a popup.
 */
export async function deletePopup(popupId: string) {
  const popup = await prisma.adminPopup.findUnique({
    where: { id: popupId },
  });

  if (!popup) {
    throw new ApiError("not_found", "Попап не найден", 404);
  }

  await prisma.adminPopup.delete({ where: { id: popupId } });
  return { success: true };
}
