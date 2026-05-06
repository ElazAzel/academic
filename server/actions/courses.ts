"use server";

/**
 * Server Actions для курсов и уроков.
 * Используют реальный Prisma client.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type { CourseDetail, ModuleDetail, LessonDetail, LessonSummary } from "@/types/domain";

export async function getCourseForStudent(courseId: string): Promise<CourseDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true, type: true, durationMinutes: true, isRequired: true } },
          },
        },
        instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { modules: true } },
      },
    });
    if (!course) return null;

    // Получить прогресс по урокам
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const progressRecords = await prisma.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessonIds } },
    });
    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    const modules: ModuleDetail[] = course.modules.map((m) => ({
      id: m.id,
      order: m.order,
      title: m.title,
      description: m.description,
      lessonsCount: m.lessons.length,
      recommendedDays: m.recommendedDays,
      status: m.status as ModuleDetail["status"],
      lessons: m.lessons.map((l) => {
        const p = progressMap.get(l.id);
        return {
          id: l.id,
          order: l.order,
          title: l.title,
          type: l.type as LessonSummary["type"],
          durationMinutes: l.durationMinutes,
          isRequired: l.isRequired,
          progressStatus: (p?.status as LessonSummary["progressStatus"]) ?? "NOT_STARTED",
          progressPercent: p?.percent ?? 0,
        };
      }),
    }));

    const totalLessons = modules.reduce((s, m) => s + m.lessonsCount, 0);

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      goal: course.goal,
      coverUrl: course.coverUrl,
      durationHours: course.durationHours,
      status: course.status as CourseDetail["status"],
      traversalMode: course.traversalMode as "sequential" | "open",
      completionThreshold: course.completionThreshold,
      modulesCount: course._count.modules,
      lessonsCount: totalLessons,
      instructors: course.instructors.map((ci) => ({
        id: ci.user.id,
        name: ci.user.name ?? "",
        email: ci.user.email,
      })),
      modules,
    };
  } catch {
    return null;
  }
}

export async function getLessonForStudent(lessonId: string): Promise<LessonDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true, lessons: { orderBy: { order: "asc" }, select: { id: true, order: true, title: true } } } },
        media: true,
        quizzes: { include: { questions: true } },
        assignments: true,
        questions: {
          where: { studentId: user.id },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!lesson) return null;

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId } },
    });

    return {
      id: lesson.id,
      order: lesson.order,
      title: lesson.title,
      summary: lesson.summary,
      type: lesson.type as LessonDetail["type"],
      durationMinutes: lesson.durationMinutes,
      isRequired: lesson.isRequired,
      progressStatus: (progress?.status as LessonDetail["progressStatus"]) ?? "NOT_STARTED",
      progressPercent: progress?.percent ?? 0,
      content: lesson.content as Record<string, unknown>,
      videoUrl: lesson.videoUrl,
      media: lesson.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        filename: m.filename,
      })),
      quizzes: lesson.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        passThreshold: q.passThreshold,
        maxAttempts: q.maxAttempts,
        questionsCount: q.questions.length,
      })),
      assignments: lesson.assignments.map((a) => ({
        id: a.id,
        title: a.title,
        deadline: a.deadline?.toISOString() ?? null,
        maxAttempts: a.maxAttempts,
      })),
    };
  } catch {
    return null;
  }
}

export async function askCuratorQuestion(lessonId: string, text: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Найти куратора для этого слушателя
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { include: { cohorts: true } } } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const curatorAssignment = await prisma.curatorAssignment.findFirst({
    where: { studentId: user.id, active: true },
  });

  const question = await prisma.lessonQuestion.create({
    data: {
      lessonId,
      studentId: user.id,
      curatorId: curatorAssignment?.curatorId ?? null,
      text,
      status: "open",
    },
  });

  return { id: question.id, status: "created" };
}
