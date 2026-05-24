import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

export async function initLaunch(launchId: string, userId: string) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  return prisma.scormLaunch.update({
    where: { id: launchId },
    data: { status: "IN_PROGRESS" },
  });
}

export async function getCmiValue(launchId: string, userId: string, name: string) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  const cmiMap: Record<string, keyof typeof launch> = {
    "cmi.core.lesson_status": "status",
    "cmi.core.score.raw": "score",
    "cmi.core.score.max": "maxScore",
    "cmi.suspend_data": "suspendData",
    "cmi.completion_status": "completion",
    "cmi.success_status": "success",
  };

  const cmi2004Map: Record<string, keyof typeof launch> = {
    "cmi.completion_status": "completion",
    "cmi.success_status": "success",
    "cmi.score.raw": "score",
    "cmi.score.max": "maxScore",
    "cmi.suspend_data": "suspendData",
  };

  const field = cmiMap[name] || cmi2004Map[name];
  if (field) {
    const value = launch[field];
    return value !== null ? String(value) : "";
  }

  return "";
}

export async function setCmiValues(launchId: string, userId: string, values: Record<string, string>) {
  const prisma = getPrisma();
  const launch = await prisma.scormLaunch.findUnique({ where: { id: launchId } });
  if (!launch) throw new ApiError("not_found", "Запуск не найден", 404);
  if (launch.userId !== userId) throw new ApiError("forbidden", "Доступ запрещён", 403);

  const update: Record<string, unknown> = {};

  if (values["cmi.core.lesson_status"] || values["cmi.completion_status"]) {
    update.status = values["cmi.core.lesson_status"] || values["cmi.completion_status"] || undefined;
  }
  if (values["cmi.core.score.raw"] || values["cmi.score.raw"]) {
    update.score = Number(values["cmi.core.score.raw"] || values["cmi.score.raw"]);
  }
  if (values["cmi.core.score.max"] || values["cmi.score.max"]) {
    update.maxScore = Number(values["cmi.core.score.max"] || values["cmi.score.max"]);
  }
  if (values["cmi.suspend_data"]) {
    update.suspendData = values["cmi.suspend_data"];
  }
  if (values["cmi.completion_status"]) {
    update.completion = values["cmi.completion_status"];
  }
  if (values["cmi.success_status"]) {
    update.success = values["cmi.success_status"];
  }

  if (Object.keys(update).length > 0) {
    return prisma.scormLaunch.update({ where: { id: launchId }, data: update });
  }

  return launch;
}
