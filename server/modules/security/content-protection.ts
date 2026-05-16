import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { Prisma } from "@prisma/client";

const prisma = getPrisma();

export type ProtectionLevel = "none" | "standard" | "strict";

export interface ContentProtectionSettings {
  signedUrlTtlSeconds: number;
  watermarkEnabled: boolean;
  contextMenuDisabled: boolean;
  visibilityLogging: boolean;
  aggressiveAudit: boolean;
}

export const PROTECTION_SETTINGS: Record<ProtectionLevel, ContentProtectionSettings> = {
  none: {
    signedUrlTtlSeconds: 0,
    watermarkEnabled: false,
    contextMenuDisabled: false,
    visibilityLogging: false,
    aggressiveAudit: false,
  },
  standard: {
    signedUrlTtlSeconds: 900,
    watermarkEnabled: true,
    contextMenuDisabled: true,
    visibilityLogging: false,
    aggressiveAudit: false,
  },
  strict: {
    signedUrlTtlSeconds: 180,
    watermarkEnabled: true,
    contextMenuDisabled: true,
    visibilityLogging: true,
    aggressiveAudit: true,
  },
};

export function getContentProtectionSettings(level: ProtectionLevel): ContentProtectionSettings {
  return PROTECTION_SETTINGS[level];
}

export async function logProtectedContentAccess(input: {
  userId: string;
  lessonId: string;
  courseId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "lesson.protected_content_opened",
    entity: "lesson",
    entityId: input.lessonId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { courseId: input.courseId },
  });
}

export async function logSignedUrlIssued(input: {
  userId: string;
  lessonId: string;
  mediaId: string;
  mimeType: string;
  sizeBytes: number;
  ttlSeconds: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "lesson.file_signed_url_issued",
    entity: "lesson_media",
    entityId: input.mediaId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      lessonId: input.lessonId,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      ttlSeconds: input.ttlSeconds,
    },
  });
}

export async function logVideoPlaybackIssued(input: {
  userId: string;
  lessonId: string;
  provider: string;
  durationSeconds: number;
  ttlSeconds: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "lesson.video_playback_url_issued",
    entity: "lesson",
    entityId: input.lessonId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      provider: input.provider,
      durationSeconds: input.durationSeconds,
      ttlSeconds: input.ttlSeconds,
    },
  });
}

export async function logFileDownloadStarted(input: {
  userId: string;
  lessonId: string;
  mediaId: string;
  fileName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "lesson.file_download_started",
    entity: "lesson_media",
    entityId: input.mediaId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { lessonId: input.lessonId, fileName: input.fileName },
  });
}

export async function logVisibilityChange(input: {
  userId: string;
  lessonId: string;
  state: "hidden" | "visible";
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: input.state === "hidden" ? "lesson.visibility_hidden" : "lesson.visibility_visible",
    entity: "lesson",
    entityId: input.lessonId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { state: input.state },
  });
}

export async function logSuspiciousAccess(input: {
  userId: string;
  lessonId?: string | null;
  reason: string;
  severity?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const auditEntry = await logAudit({
    actorId: input.userId,
    action: "lesson.suspicious_repeated_access",
    entity: "lesson",
    entityId: input.lessonId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { reason: input.reason, severity: input.severity ?? "medium" },
  });

  await prisma.riskFlag.create({
    data: {
      userId: input.userId,
      type: "suspicious_media_access",
      severity: input.severity ?? "medium",
      status: "open",
      metadata: { reason: input.reason, lessonId: input.lessonId, auditLogId: auditEntry.id } as Prisma.JsonObject,
    },
  });

  return auditEntry;
}

export async function logForbiddenMediaAccess(input: {
  userId: string;
  mediaId?: string | null;
  lessonId?: string | null;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "security.forbidden_media_access",
    entity: "lesson_media",
    entityId: input.mediaId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { lessonId: input.lessonId, reason: input.reason },
  });
}

export async function logLockedLessonAccessAttempt(input: {
  userId: string;
  lessonId: string;
  courseId: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return logAudit({
    actorId: input.userId,
    action: "security.locked_lesson_access_attempt",
    entity: "lesson",
    entityId: input.lessonId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { courseId: input.courseId, reason: input.reason },
  });
}

export async function detectRepeatedSignedUrlRequests(input: {
  userId: string;
  lessonId: string;
  windowMinutes: number;
  threshold: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - input.windowMinutes * 60 * 1000);

  const count = await prisma.auditLog.count({
    where: {
      actorId: input.userId,
      action: "lesson.file_signed_url_issued",
      entity: "lesson_media",
      createdAt: { gte: since },
    },
  });

  return count >= input.threshold;
}

export async function detectCrossDeviceAccessPattern(input: {
  userId: string;
  windowMinutes: number;
  threshold: number;
}): Promise<boolean> {
  const since = new Date(Date.now() - input.windowMinutes * 60 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: {
      actorId: input.userId,
      userAgent: { not: null },
      createdAt: { gte: since },
    },
    select: { userAgent: true },
    distinct: ["userAgent"],
  });

  return logs.length >= input.threshold;
}
