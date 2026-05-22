import { EnrollmentStatus, ProgressStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { clamp } from "@/lib/utils";
import { TRAVERSAL_MODES } from "@/lib/constants";
import { logAudit } from "@/server/modules/audit/service";
import { issueCertificate } from "@/server/modules/certificates/service";
import { createNotification } from "@/server/modules/notifications/service";

const prisma = getPrisma();

export function getCompletionBasis<T extends { isRequired: boolean | null }>(lessons: T[]) {
  const required = lessons.filter((l) => l.isRequired);
  return required.length > 0 ? required : lessons;
}

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
      },
      quizzes: { select: { id: true } },
      assignments: { select: { id: true } }
    }
  });
  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }

  // C3: Сервер проверяет реальное прохождение теста/приёмку задания
  let canComplete = true;
  if ((lesson.quizzes?.length ?? 0) > 0) {
    const passedQuiz = await prisma.quizAttempt.findFirst({
      where: {
        quizId: { in: (lesson.quizzes ?? []).map((q) => q.id) },
        userId,
        passed: true,
      },
      select: { id: true },
    });
    if (!passedQuiz) canComplete = false;
  }
  if ((lesson.assignments?.length ?? 0) > 0) {
    const acceptedAssignment = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId: { in: (lesson.assignments ?? []).map((a) => a.id) },
        userId,
        status: "ACCEPTED",
      },
      select: { id: true },
    });
    if (!acceptedAssignment) canComplete = false;
  }

  // Если урок требует прохождения, но студент его не прошёл — маскимальный прогресс 99%
  const effectivePercent = canComplete ? percent : Math.min(percent, 99);

  const status = effectivePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.module.course.id } }
  });
  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new ApiError("forbidden", "Нет доступа к этому уроку", 403);
  }

  const course = lesson.module.course;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // FOR UPDATE на enrollment — mutex per-user-per-course для сериализации
    // concurrent запросов прогресса (предотвращает race condition в sequential unlock
    // и в расчёте процента завершения модуля/курса)
    await tx.$queryRaw(
      Prisma.sql`SELECT 1 FROM "enrollment" WHERE "user_id" = ${userId} AND "course_id" = ${course.id} FOR UPDATE`
    );

    // Sequential unlock check — ВНУТРИ транзакции, чтобы гарантировать атомарность
    // проверки и обновления прогресса
    if (course.traversalMode === TRAVERSAL_MODES.SEQUENTIAL) {
      const orderedLessons = course.modules
        .flatMap((module) => module.lessons.map((item) => ({ ...item, moduleOrder: module.order })))
        .sort((left, right) => left.moduleOrder - right.moduleOrder || left.order - right.order);
      const currentIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
      const previousRequiredLessonIds = orderedLessons
        .slice(0, Math.max(currentIndex, 0))
        .filter((item) => item.isRequired)
        .map((item) => item.id);

      if (previousRequiredLessonIds.length > 0) {
        const completedPreviousLessons = await tx.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: previousRequiredLessonIds },
            status: ProgressStatus.COMPLETED
          }
        });
        if (completedPreviousLessons !== previousRequiredLessonIds.length) {
          throw new ApiError("forbidden", "Сначала завершите предыдущие обязательные уроки", 403);
        }
      }
    }

    const previousLessonProgress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, completedAt: true },
    });
    const lessonProgress = await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        percent: effectivePercent,
        status,
        lastSeenAt: now,
        completedAt: status === ProgressStatus.COMPLETED ? (previousLessonProgress?.completedAt ?? now) : null,
        enrollmentId: enrollment?.id
      },
      create: {
        userId,
        lessonId,
        enrollmentId: enrollment?.id,
        percent: effectivePercent,
        status,
        startedAt: now,
        lastSeenAt: now,
        completedAt: status === ProgressStatus.COMPLETED ? now : null
      }
    });

    // Block-level progress (if lesson belongs to a block)
    let blockProgress = null;
    let blockJustCompleted = false;
    if (lesson.blockId) {
      const block = await tx.block.findUnique({
        where: { id: lesson.blockId },
        include: { lessons: true }
      });
      if (block) {
        const previousBlockProgress = await tx.blockProgress.findUnique({
          where: { userId_blockId: { userId, blockId: lesson.blockId } },
          select: { status: true, completedAt: true },
        });
        const blockLessons = getCompletionBasis(block.lessons);
        const completedBlockLessons = await tx.lessonProgress.count({
          where: {
            userId,
            lessonId: { in: blockLessons.map((item) => item.id) },
            status: ProgressStatus.COMPLETED
          }
        });
        const blockPercent = blockLessons.length === 0 ? 0 : Math.round((completedBlockLessons / blockLessons.length) * 100);
        const blockStatus = blockPercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
        blockJustCompleted = previousBlockProgress?.status !== ProgressStatus.COMPLETED && blockStatus === ProgressStatus.COMPLETED;
        blockProgress = await tx.blockProgress.upsert({
          where: { userId_blockId: { userId, blockId: lesson.blockId } },
          update: {
            percent: blockPercent,
            status: blockStatus,
            completedAt: blockStatus === ProgressStatus.COMPLETED ? (previousBlockProgress?.completedAt ?? now) : null,
            enrollmentId: enrollment?.id
          },
          create: {
            userId,
            blockId: lesson.blockId,
            enrollmentId: enrollment?.id,
            percent: blockPercent,
            status: blockStatus,
            completedAt: blockStatus === ProgressStatus.COMPLETED ? now : null
          }
        });
      }
    }

    const previousModuleProgress = await tx.moduleProgress.findUnique({
      where: { userId_moduleId: { userId, moduleId: lesson.moduleId } },
      select: { status: true, completedAt: true },
    });
    const moduleLessons = getCompletionBasis(lesson.module.lessons);
    const completedModuleLessons = await tx.lessonProgress.count({
      where: {
        userId,
        lessonId: { in: moduleLessons.map((item) => item.id) },
        status: ProgressStatus.COMPLETED
      }
    });
    const modulePercent = moduleLessons.length === 0 ? 0 : Math.round((completedModuleLessons / moduleLessons.length) * 100);
    const moduleStatus = modulePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
    const moduleJustCompleted = previousModuleProgress?.status !== ProgressStatus.COMPLETED && moduleStatus === ProgressStatus.COMPLETED;
    const moduleProgress = await tx.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: lesson.moduleId } },
      update: {
        percent: modulePercent,
        status: moduleStatus,
        completedAt: moduleStatus === ProgressStatus.COMPLETED ? (previousModuleProgress?.completedAt ?? now) : null,
        enrollmentId: enrollment?.id
      },
      create: {
        userId,
        moduleId: lesson.moduleId,
        enrollmentId: enrollment?.id,
        percent: modulePercent,
        status: moduleStatus,
        completedAt: moduleStatus === ProgressStatus.COMPLETED ? now : null
      }
    });

    const previousCourseProgress = await tx.courseProgress.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { status: true, completedAt: true },
    });
    const courseLessons = getCompletionBasis(course.modules.flatMap((m) => m.lessons));
    const completedCourseLessons = await tx.lessonProgress.count({
      where: {
        userId,
        lessonId: { in: courseLessons.map((item) => item.id) },
        status: ProgressStatus.COMPLETED
      }
    });
    const coursePercent = courseLessons.length === 0 ? 0 : Math.round((completedCourseLessons / courseLessons.length) * 100);
    const courseStatus = coursePercent >= 100 ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS;
    const courseJustCompleted = previousCourseProgress?.status !== ProgressStatus.COMPLETED && courseStatus === ProgressStatus.COMPLETED;
    const courseProgress = await tx.courseProgress.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: {
        percent: coursePercent,
        status: courseStatus,
        completedAt: courseStatus === ProgressStatus.COMPLETED ? (previousCourseProgress?.completedAt ?? now) : null,
        enrollmentId: enrollment?.id
      },
      create: {
        userId,
        courseId: course.id,
        enrollmentId: enrollment?.id,
        percent: coursePercent,
        status: courseStatus,
        completedAt: courseStatus === ProgressStatus.COMPLETED ? now : null
      }
    });

    return { lessonProgress, blockProgress, moduleProgress, courseProgress, blockJustCompleted, moduleJustCompleted, courseJustCompleted, modulePercent, coursePercent };
  });

  await logAudit({ actorId: userId, action: "progress.lesson_marked", entity: "lesson", entityId: lessonId, metadata: { percent } });

  // Send notification when block is completed
  if (lesson.blockId && result.blockJustCompleted) {
    const block = await prisma.block.findUnique({ where: { id: lesson.blockId }, select: { title: true } });
    createNotification({
      userId,
      event: "block_completed",
      title: "Блок пройден",
      body: `Вы завершили блок «${block?.title ?? ""}»`,
      data: {
        refType: "block",
        refId: lesson.blockId,
        link: `/student/courses/${course.id}`,
      },
    }).catch((e) => console.error("Failed to send block completion notification:", e));
  }

  // Send notification when module is completed
  if (result.moduleJustCompleted) {
    const module_ = await prisma.module.findUnique({ where: { id: lesson.moduleId }, select: { title: true } });
    createNotification({
      userId,
      event: "module_completed",
      title: "Модуль пройден",
      body: `Поздравляем с завершением модуля «${module_?.title ?? ""}»!`,
      data: {
        refType: "module",
        refId: lesson.moduleId,
        link: `/student/courses/${course.id}`,
      },
    }).catch((e) => console.error("Failed to send module completion notification:", e));
  }

  if (result.coursePercent >= course.completionThreshold) {
    const existing = await prisma.certificate.findFirst({
      where: { userId, courseId: course.id }
    });
    if (!existing) {
      issueCertificate({ userId, courseId: course.id }, userId).catch(
        (e) => console.error("Failed to auto-issue certificate:", e)
      );
    }
  }

  return result;
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
