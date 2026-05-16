import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import { getSupabaseStorageSignedUrlAsync, createSignedDownloadUrl } from "@/lib/storage";
import {
  logSignedUrlIssued,
  logForbiddenMediaAccess,
  logSuspiciousAccess,
  detectRepeatedSignedUrlRequests,
  getContentProtectionSettings,
} from "@/server/modules/security/content-protection-server";
import { CONTENT_PROTECTION } from "@/lib/constants";
import { env } from "@/lib/env";

const prisma = getPrisma();

type Context = { params: Promise<{ lessonId: string; mediaId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId, mediaId } = await context.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });

    if (!lesson) {
      await logForbiddenMediaAccess({
        userId: user.id,
        lessonId,
        mediaId,
        reason: "Lesson not found",
      });
      return errorResponse(new Error("Урок не найден"));
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
      return errorResponse(new Error("Нет доступа к этому уроку"));
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
      return errorResponse(new Error("Файл не найден"));
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
      signedUrl = await getSupabaseStorageSignedUrlAsync(
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
      return errorResponse(new Error("Не удалось получить ссылку на файл"));
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
