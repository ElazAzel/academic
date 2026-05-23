"use server";

import { maskStudentName } from "@/lib/utils";
import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export interface LessonAttendanceRow {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  moduleTitle: string;
  totalStudents: number;
  viewedStudents: number;
  viewPercent: number;
}

export interface StudentAttendanceDetail {
  userId: string;
  userName: string;
  email: string;
  lastLessonAccess: string | null;
  lessonsViewed: number;
  totalLessons: number;
  progressPercent: number;
}

/**
 * Получить посещаемость уроков для курса (по инструктору).
 */
export async function getCourseAttendance(courseId: string): Promise<LessonAttendanceRow[]> {
  await requireUser("courses:read");

  // Получаем все уроки курса
  const lessons = await getPrisma().lesson.findMany({
    where: { module: { courseId } },
    select: {
      id: true,
      title: true,
      order: true,
      module: { select: { title: true } },
    },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });

  if (lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  // Считаем уникальных студентов, просматривавших каждый урок (через activity_logs)
  const accessCounts = await getPrisma().activityLog.groupBy({
    by: ["resourceId"],
    where: {
      action: "lesson_access",
      resourceId: { in: lessonIds },
    },
    _count: { userId: true },
  });

  const accessMap = new Map(accessCounts.map((a) => [a.resourceId, a._count.userId]));

  // Общее количество студентов на курсе (enrolled)
  const totalStudents = await getPrisma().enrollment.count({
    where: { courseId, status: "ACTIVE" },
  });

  return lessons.map((lesson) => {
    const viewedStudents = accessMap.get(lesson.id) ?? 0;
    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonOrder: lesson.order,
      moduleTitle: lesson.module.title,
      totalStudents,
      viewedStudents,
      viewPercent: totalStudents > 0 ? Math.round((viewedStudents / totalStudents) * 100) : 0,
    };
  });
}

/**
 * Получить детальную посещаемость студентов по уроку.
 */
export async function getLessonAttendanceDetail(lessonId: string): Promise<StudentAttendanceDetail[]> {
  await requireUser("courses:read");

  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  });
  if (!lesson) return [];

  // Студенты, enrolled в курс
  const enrollments = await getPrisma().enrollment.findMany({
    where: { courseId: lesson.module.courseId, status: "ACTIVE" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Кто просматривал урок
  const accessLogs = await getPrisma().activityLog.findMany({
    where: {
      action: "lesson_access",
      resourceId: lessonId,
      userId: { in: enrollments.map((e) => e.userId) },
    },
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const lastAccessMap = new Map<string, string>();
  const viewedSet = new Set<string>();
  for (const log of accessLogs) {
    if (!viewedSet.has(log.userId)) {
      viewedSet.add(log.userId);
    }
    if (!lastAccessMap.has(log.userId)) {
      lastAccessMap.set(log.userId, log.createdAt.toISOString());
    }
  }

  // Прогресс студентов
  const progresses = await getPrisma().lessonProgress.findMany({
    where: {
      lessonId,
      userId: { in: enrollments.map((e) => e.userId) },
    },
    select: { userId: true, percent: true },
  });
  const progressMap = new Map(progresses.map((p) => [p.userId, p.percent]));

  const totalLessons = await getPrisma().lesson.count({
    where: { module: { courseId: lesson.module.courseId } },
  });

  return enrollments.map((enrollment) => {
    const userId = enrollment.user.id;
    return {
      userId,
      userName: maskStudentName(userId),
      email: enrollment.user.email,
      lastLessonAccess: lastAccessMap.get(userId) ?? null,
      lessonsViewed: viewedSet.has(userId) ? 1 : 0,
      totalLessons,
      progressPercent: progressMap.get(userId) ?? 0,
    };
  });
}

/**
 * Получить курсы инструктора для выбора.
 */
export async function getInstructorCourses() {
  const user = await requireUser("courses:read");
  return getPrisma().course.findMany({
    where: { instructors: { some: { userId: user.id } } },
    select: { id: true, title: true, status: true },
    orderBy: { title: "asc" },
  });
}
