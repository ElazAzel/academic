import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { EnrollmentStatus, ProgressStatus } from "@prisma/client";
import { getSupabaseStorageSignedUrl, createSignedDownloadUrl } from "@/lib/storage";
import {
  logSignedUrlIssued,
  logForbiddenMediaAccess,
  logSuspiciousAccess,
  detectRepeatedSignedUrlRequests,
  getContentProtectionSettings,
} from "@/server/modules/security/content-protection-server";
import { CONTENT_PROTECTION, TRAVERSAL_MODES } from "@/lib/constants";
import { env } from "@/lib/env";
import { logLockedLessonAccessAttempt } from "@/server/modules/security/content-protection-server";

const prisma = getPrisma();

type Context = { params: Promise<{ lessonId: string; mediaId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId, mediaId } = await context.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, moduleId: true, module: { select: { courseId: true, course: { select: { traversalMode: true } } } } },
    });

    if (!lesson) {
      await logForbiddenMediaAccess({
        userId: user.id,
        lessonId,
        mediaId,
        reason: "Lesson not found",
      });
      return errorResponse(new ApiError("not_found", "Урок не найден", 404));
    }

    const courseId = lesson.module.courseId;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      await logForbiddenMediaAccess({
        userId: user.id,
        lessonId,
        mediaId,
        reason: "No active enrollment",
      });
      return errorResponse(new ApiError("forbidden", "Нет доступа к этому уроку", 403));
    }

    if (lesson.module.course.traversalMode === TRAVERSAL_MODES.SEQUENTIAL) {
      const orderedLessons = await prisma.lesson.findMany({
        where: { moduleId: lesson.moduleId },
        orderBy: { order: "asc" },
        select: { id: true, isRequired: true },
      });

      const currentIndex = orderedLessons.findIndex((l) => l.id === lessonId);
      const previousRequiredLessons = orderedLessons
        .slice(0, Math.max(currentIndex, 0))
        .filter((l) => l.isRequired);

      if (previousRequiredLessons.length > 0) {
        const completedCount = await prisma.lessonProgress.count({
          where: {
            userId: user.id,
            lessonId: { in: previousRequiredLessons.map((l) => l.id) },
            status: ProgressStatus.COMPLETED,
          },
        });

        if (completedCount < previousRequiredLessons.length) {
          await logLockedLessonAccessAttempt({
            userId: user.id,
            lessonId,
            courseId,
            reason: "Sequential lock: previous required lessons not completed",
          });
          return errorResponse(new ApiError("forbidden", "Сначала завершите предыдущие обязательные уроки", 403));
        }
      }
    }

    const media = await prisma.lessonMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.lessonId !== lessonId) {
      await logForbiddenMediaAccess({
        userId: user.id,
        lessonId,
        mediaId,
        reason: "Media does not belong to lesson",
      });
      return errorResponse(new ApiError("not_found", "Файл не найден", 404));
    }

    const settings = getContentProtectionSettings("standard");
    const ttl = settings.signedUrlTtlSeconds;

    const isRepeated = await detectRepeatedSignedUrlRequests({
      userId: user.id,
      lessonId,
      windowMinutes: CONTENT_PROTECTION.SUSPICIOUS_REQUEST_WINDOW_MINUTES,
      threshold: CONTENT_PROTECTION.SUSPICIOUS_REQUEST_THRESHOLD,
    });

    if (isRepeated) {
      await logSuspiciousAccess({
        userId: user.id,
        lessonId,
        reason: `Repeated signed URL requests: >${CONTENT_PROTECTION.SUSPICIOUS_REQUEST_THRESHOLD} in ${CONTENT_PROTECTION.SUSPICIOUS_REQUEST_WINDOW_MINUTES}min`,
      });
    }

    let signedUrl: string | null = null;

    if (media.storageKey) {
      signedUrl = await getSupabaseStorageSignedUrl(
        env.S3_BUCKET,
        media.storageKey,
        ttl,
      );

      if (!signedUrl) {
        signedUrl = await createSignedDownloadUrl(media.storageKey, ttl);
      }
    }

    if (!signedUrl && media.url) {
      signedUrl = media.url;
    }

    if (!signedUrl) {
      return errorResponse(new ApiError("service_unavailable", "Не удалось получить ссылку на файл", 503));
    }

    await logSignedUrlIssued({
      userId: user.id,
      lessonId,
      mediaId,
      mimeType: media.mimeType ?? "application/octet-stream",
      sizeBytes: media.sizeBytes ?? 0,
      ttlSeconds: ttl,
    });

    const expiresAt = new Date(Date.now() + ttl * 1000);

    return ok({
      url: signedUrl,
      expiresAt: expiresAt.toISOString(),
      fileName: media.filename ?? "file",
      mimeType: media.mimeType ?? "application/octet-stream",
      sizeBytes: media.sizeBytes ?? 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
