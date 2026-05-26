import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { EnrollmentStatus, ProgressStatus } from "@prisma/client";
import { getSupabaseStorageSignedUrl, createSignedDownloadUrl } from "@/lib/storage";
import {
  logVideoPlaybackIssued,
  logForbiddenMediaAccess,
  logLockedLessonAccessAttempt,
  getContentProtectionSettings,
} from "@/server/modules/security/content-protection-server";
import { TRAVERSAL_MODES } from "@/lib/constants";
import { env } from "@/lib/env";

const prisma = getPrisma();

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        videoUrl: true,
        durationMinutes: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: { traversalMode: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      await logForbiddenMediaAccess({
        userId: user.id,
        lessonId,
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

    const settings = getContentProtectionSettings("standard");
    const ttl = settings.signedUrlTtlSeconds;

    let provider = "youtube";
    let playbackUrl: string | null = null;
    const durationSeconds = lesson.durationMinutes * 60;

    if (lesson.videoUrl) {
      const videoUrl = lesson.videoUrl;

      if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
        provider = "youtube";
        let videoId = "";
        try {
          const url = new URL(videoUrl);
          if (url.hostname.includes("youtube.com")) {
            videoId = url.searchParams.get("v") ?? url.pathname.split("/").pop() ?? "";
          } else if (url.hostname === "youtu.be") {
            videoId = url.pathname.slice(1);
          }
        } catch {
          videoId = videoUrl;
        }
        playbackUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
      } else if (videoUrl.includes("storageKey:") || videoUrl.startsWith("/storage/")) {
        const storageKey = videoUrl.replace("storageKey:", "").replace("/storage/", "");
        provider = "supabase_storage";

        playbackUrl = await getSupabaseStorageSignedUrl(
          env.S3_BUCKET,
          storageKey,
          ttl,
        );

        if (!playbackUrl) {
          playbackUrl = await createSignedDownloadUrl(storageKey, ttl);
        }
      } else {
        playbackUrl = videoUrl;
        provider = "external";
      }
    }

    if (!playbackUrl) {
      return errorResponse(new ApiError("not_found", "Видео не найдено", 404));
    }

    await logVideoPlaybackIssued({
      userId: user.id,
      lessonId,
      provider,
      durationSeconds,
      ttlSeconds: ttl,
    });

    const expiresAt = new Date(Date.now() + ttl * 1000);

    return ok({
      provider,
      playbackUrl,
      expiresAt: expiresAt.toISOString(),
      durationSeconds,
      watermarkEnabled: settings.watermarkEnabled,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
