"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";
import { parseMediaUploadPrefixFromKey } from "@/lib/media-upload-policy";

const prisma = getPrisma();
const UPLOAD_LESSON_MEDIA_ERROR = "Не удалось сохранить медиафайл урока";
const DELETE_LESSON_MEDIA_ERROR = "Произошла ошибка при удалении файла";

function getSafeActionErrorMetadata(error: unknown) {
  const errorType = error instanceof Error ? error.name : typeof error;
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
      errorType,
      code: typeof record.code === "string" ? record.code : undefined,
      statusCode: typeof record.statusCode === "number" || typeof record.statusCode === "string"
        ? record.statusCode
        : typeof record.status === "number" || typeof record.status === "string"
          ? record.status
          : undefined,
    };
  }

  return { errorType };
}

const UploadLessonMediaActionSchema = z.object({
  lessonId: z.string().min(1, "ID урока обязателен"),
  type: z.string().min(1, "Тип файла обязателен"),
  fileUrl: z.string().url("Некорректный URL файла"),
  filename: z.string().optional(),
  storageKey: z.string().optional(),
});

async function assertCanManageCourseMedia(actor: { id: string; roles: string[] }, courseId: string) {
  if (actor.roles.includes("admin")) return;

  const instructorCourse = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: actor.id } },
    select: { courseId: true },
  });

  if (!instructorCourse) {
    throw new ApiError("forbidden", "Курс недоступен для редактирования", 403);
  }
}

async function assertCanManageLessonMedia(actor: { id: string; roles: string[] }, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });

  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }

  await assertCanManageCourseMedia(actor, lesson.module.courseId);
  return lesson.module.courseId;
}

async function getLessonMediaContext(mediaId: string) {
  const media = await prisma.lessonMedia.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      lessonId: true,
      lesson: { select: { module: { select: { courseId: true } } } },
    },
  });

  if (!media) {
    throw new ApiError("not_found", "Медиафайл не найден", 404);
  }

  return {
    lessonId: media.lessonId,
    courseId: media.lesson.module.courseId,
  };
}

export async function uploadLessonMediaAction(lessonId: string, type: string, fileUrl: string, filename?: string, storageKey?: string) {
  try {
    const parsed = UploadLessonMediaActionSchema.safeParse({ lessonId, type, fileUrl, filename, storageKey });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const actor = await requireRole(["admin", "instructor"]);
    const courseId = await assertCanManageLessonMedia(actor, parsed.data.lessonId);
    const managedStorageKey = parsed.data.storageKey;

    if (managedStorageKey) {
      const prefix = parseMediaUploadPrefixFromKey(managedStorageKey);
      if (!prefix || prefix === "submissions") {
        throw new ApiError("validation_error", "Недопустимый ключ хранилища для материала урока", 422);
      }
    }

    const media = await prisma.lessonMedia.create({
      data: {
        lessonId,
        type,
        url: fileUrl,
        filename,
        storageKey: managedStorageKey
      }
    });

    await logAudit({
      actorId: actor.id,
      action: "file.uploaded",
      entity: "lesson_media",
      entityId: media.id,
      metadata: { lessonId, courseId, type, fileUrl }
    });

    return media;
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("[uploadLessonMediaAction]", getSafeActionErrorMetadata(error));
      throw new ApiError("internal_error", UPLOAD_LESSON_MEDIA_ERROR, 500);
    }
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
    const mediaContext = await getLessonMediaContext(parsed.data.mediaId);
    await assertCanManageCourseMedia(actor, mediaContext.courseId);

    await prisma.lessonMedia.delete({
      where: { id: mediaId }
    });

    await logAudit({
      actorId: actor.id,
      action: "file.deleted",
      entity: "lesson_media",
      entityId: mediaId,
      metadata: mediaContext
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: error.message };
    }
    console.error("[deleteLessonMediaAction]", getSafeActionErrorMetadata(error));
    return { success: false, error: DELETE_LESSON_MEDIA_ERROR };
  }
}
