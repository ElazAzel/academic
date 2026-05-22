import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ScormPackageInfo {
  id: string;
  lessonId: string;
  title: string;
  scormVersion: string;
  entryUrl: string | null;
  status: string;
  createdAt: string;
}

export interface ScormLaunchInfo {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  completion: string;
  success: string;
  createdAt: string;
}

/* ── Service ────────────────────────────────────────────────────────── */

/**
 * Получить SCORM-пакет урока, если есть.
 */
export async function getScormPackage(lessonId: string): Promise<ScormPackageInfo | null> {
  const pkg = await getPrisma().scormPackage.findUnique({
    where: { lessonId },
    select: {
      id: true,
      lessonId: true,
      title: true,
      scormVersion: true,
      entryUrl: true,
      status: true,
      createdAt: true,
    },
  });
  if (!pkg) return null;

  return {
    ...pkg,
    scormVersion: pkg.scormVersion,
    createdAt: pkg.createdAt.toISOString(),
  };
}

/**
 * Зарегистрировать новый запуск SCORM-пакета.
 */
export async function createScormLaunch(
  userId: string,
  lessonId: string,
  packageId: string,
): Promise<ScormLaunchInfo> {
  // Проверяем, что пакет существует
  const pkg = await getPrisma().scormPackage.findUnique({
    where: { id: packageId, lessonId },
  });
  if (!pkg) {
    throw new ApiError("not_found", "SCORM-пакет не найден", 404);
  }

  const launch = await getPrisma().scormLaunch.create({
    data: {
      packageId,
      userId,
      lessonId,
      status: "LAUNCHED",
    },
  });

  return {
    id: launch.id,
    status: launch.status,
    score: launch.score,
    maxScore: launch.maxScore,
    completion: launch.completion ?? "unknown",
    success: launch.success ?? "unknown",
    createdAt: launch.createdAt.toISOString(),
  };
}

/**
 * Обновить статус SCORM-запуска (вызывается SCORM API Bridge).
 */
export async function updateScormLaunch(
  launchId: string,
  userId: string,
  data: {
    status?: string;
    suspendData?: string;
    score?: number;
    maxScore?: number;
    completion?: string;
    success?: string;
  },
): Promise<void> {
  const launch = await getPrisma().scormLaunch.findUnique({
    where: { id: launchId },
    select: { userId: true },
  });
  if (!launch || launch.userId !== userId) {
    throw new ApiError("forbidden", "Нет доступа к запуску", 403);
  }

  await getPrisma().scormLaunch.update({
    where: { id: launchId },
    data: {
      ...(data.status !== undefined ? { status: data.status as any } : {}),
      ...(data.suspendData !== undefined ? { suspendData: data.suspendData } : {}),
      ...(data.score !== undefined ? { score: data.score } : {}),
      ...(data.maxScore !== undefined ? { maxScore: data.maxScore } : {}),
      ...(data.completion !== undefined ? { completion: data.completion } : {}),
      ...(data.success !== undefined ? { success: data.success } : {}),
    },
  });
}

/**
 * Получить историю SCORM-запусков пользователя для урока.
 */
export async function getScormLaunchHistory(
  userId: string,
  lessonId: string,
): Promise<ScormLaunchInfo[]> {
  const launches = await getPrisma().scormLaunch.findMany({
    where: { userId, lessonId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      score: true,
      maxScore: true,
      completion: true,
      success: true,
      createdAt: true,
    },
  });

  return launches.map((l) => ({
    id: l.id,
    status: l.status,
    score: l.score,
    maxScore: l.maxScore,
    completion: l.completion ?? "unknown",
    success: l.success ?? "unknown",
    createdAt: l.createdAt.toISOString(),
  }));
}
