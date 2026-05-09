"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import crypto from "crypto";

const prisma = getPrisma();

export async function createInviteAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);

    const courseId = formData.get("courseId") as string || undefined;
    const cohortId = formData.get("cohortId") as string || undefined;
    const maxActivations = Number(formData.get("maxActivations")) || 1;
    const expiresAtStr = formData.get("expiresAt") as string;
    const allowedEmailsRaw = formData.get("allowedEmails") as string;

    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;
    const allowedEmails = allowedEmailsRaw
      ? allowedEmailsRaw.split("\n").map(e => e.trim()).filter(Boolean)
      : [];

    const token = crypto.randomBytes(6).toString("hex").toUpperCase();

    const invite = await prisma.inviteLink.create({
      data: {
        token,
        courseId,
        cohortId,
        maxActivations,
        expiresAt,
        allowedEmails,
        createdById: actor.id,
        status: "active"
      }
    });

    await logAudit({
      actorId: actor.id,
      action: "invite.created",
      entity: "invite_link",
      entityId: invite.id,
      metadata: { token, courseId, cohortId }
    });

    revalidatePath("/admin/invites");
    return { success: true };
  } catch (error) {
    console.error("Create invite error:", error);
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function deleteInviteAction(inviteId: string) {
  try {
    const actor = await requireRole(["admin"]);

    await prisma.inviteLink.delete({
      where: { id: inviteId }
    });

    await logAudit({
      actorId: actor.id,
      action: "invite.deleted",
      entity: "invite_link",
      entityId: inviteId
    });

    revalidatePath("/admin/invites");
    return { success: true };
  } catch (error) {
    console.error("Delete invite error:", error);
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}
