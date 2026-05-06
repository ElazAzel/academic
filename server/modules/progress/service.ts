import { ProgressStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { clamp } from "@/lib/utils";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function markLessonProgress(userId: string, lessonId: string, percentInput: number) {
  const percent = clamp(percentInput, 0, 100);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              modules: { include: { lessons: true } }
            }
          },
          lessons: true
        }
      }
    }
  });
  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }
  const status = percent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.module.course.id } }
  });

  const lessonProgress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      percent,
      status,
      lastSeenAt: new Date(),
      completedAt: status === ProgressStatus.COMPLETED ? new Date() : undefined,
      enrollmentId: enrollment?.id
    },
    create: {
      userId,
      lessonId,
      enrollmentId: enrollment?.id,
      percent,
      status,
      startedAt: new Date(),
      lastSeenAt: new Date(),
      completedAt: status === ProgressStatus.COMPLETED ? new Date() : undefined
    }
  });

  const moduleLessons = lesson.module.lessons;
  const completedModuleLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: moduleLessons.map((item) => item.id) },
      status: ProgressStatus.COMPLETED
    }
  });
  const modulePercent = moduleLessons.length === 0 ? 0 : Math.round((completedModuleLessons / moduleLessons.length) * 100);
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId: lesson.moduleId } },
    update: {
      percent: modulePercent,
      status: modulePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
      completedAt: modulePercent >= 100 ? new Date() : undefined,
      enrollmentId: enrollment?.id
    },
    create: {
      userId,
      moduleId: lesson.moduleId,
      enrollmentId: enrollment?.id,
      percent: modulePercent,
      status: modulePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
      completedAt: modulePercent >= 100 ? new Date() : undefined
    }
  });

  const courseLessons = lesson.module.course.modules.flatMap((module) => module.lessons);
  const completedCourseLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: courseLessons.map((item) => item.id) },
      status: ProgressStatus.COMPLETED
    }
  });
  const coursePercent = courseLessons.length === 0 ? 0 : Math.round((completedCourseLessons / courseLessons.length) * 100);
  await prisma.courseProgress.upsert({
    where: { userId_courseId: { userId, courseId: lesson.module.course.id } },
    update: {
      percent: coursePercent,
      status: coursePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
      completedAt: coursePercent >= 100 ? new Date() : undefined,
      enrollmentId: enrollment?.id
    },
    create: {
      userId,
      courseId: lesson.module.course.id,
      enrollmentId: enrollment?.id,
      percent: coursePercent,
      status: coursePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS,
      completedAt: coursePercent >= 100 ? new Date() : undefined
    }
  });

  await logAudit({ actorId: userId, action: "progress.lesson_marked", entity: "lesson", entityId: lessonId, metadata: { percent } });
  return { lessonProgress, modulePercent, coursePercent };
}

export async function getProgressSnapshot(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: true,
      cohort: true,
      courseProgress: true,
      lessonProgress: { orderBy: { updatedAt: "desc" }, take: 5 }
    }
  });
  const continueLearning = await prisma.lessonProgress.findFirst({
    where: { userId, status: { in: [ProgressStatus.IN_PROGRESS, ProgressStatus.NOT_STARTED] } },
    orderBy: { updatedAt: "desc" },
    include: { lesson: { include: { module: { include: { course: true } } } } }
  });
  return { enrollments, continueLearning };
}

