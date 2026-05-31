"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";
import crypto from "crypto";

const prisma = getPrisma();

const UploadLessonMediaActionSchema = z.object({
  lessonId: z.string().min(1, "ID урока обязателен"),
  type: z.string().min(1, "Тип файла обязателен"),
  fileUrl: z.string().url("Некорректный URL файла"),
  filename: z.string().optional(),
});

export async function uploadLessonMediaAction(lessonId: string, type: string, fileUrl: string, filename?: string) {
  try {
    const parsed = UploadLessonMediaActionSchema.safeParse({ lessonId, type, fileUrl, filename });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

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
  } catch (error) {
    console.error("[uploadLessonMediaAction]", error);
    throw error;
  }
}

const DeleteLessonMediaActionSchema = z.object({
  mediaId: z.string().min(1, "ID медиафайла обязателен"),
});

export async function deleteLessonMediaAction(mediaId: string) {
  try {
    const parsed = DeleteLessonMediaActionSchema.safeParse({ mediaId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

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
  } catch (error) {
    console.error("[deleteLessonMediaAction]", error);
    return { success: false, error: "Произошла ошибка при удалении файла" };
  }
}
