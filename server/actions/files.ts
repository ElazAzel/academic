"use server";

import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import crypto from "crypto";

const prisma = getPrisma();

export async function uploadLessonMediaAction(lessonId: string, type: string, fileUrl: string, filename?: string) {
  const actor = await requireRole(["admin", "instructor"]);

  const media = await prisma.lessonMedia.create({
    data: {
      lessonId,
      type,
      url: fileUrl,
      filename,
      storageKey: `local_${crypto.randomUUID()}`
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "file.uploaded",
    entity: "lesson_media",
    entityId: media.id,
    metadata: { lessonId, type, fileUrl }
  });

  return media;
}

export async function deleteLessonMediaAction(mediaId: string) {
  const actor = await requireRole(["admin", "instructor"]);

  await prisma.lessonMedia.delete({
    where: { id: mediaId }
  });

  await logAudit({
    actorId: actor.id,
    action: "file.deleted",
    entity: "lesson_media",
    entityId: mediaId
  });

  return { success: true };
}
