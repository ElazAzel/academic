import { LessonType, CourseStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { logAudit } from "@/server/modules/audit/service";
import type { CourseBuilderDetail, BuilderModuleDetail, BuilderLessonDetail, ContentBlock } from "@/types/domain";

const prisma = getPrisma();

async function assertInstructorOfCourse(actorId: string, courseId: string) {
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    include: { roles: { include: { role: { select: { key: true } } } } }
  });
  if (!user) throw new Error("Пользователь не найден");
  const roleKeys = user.roles.map((r) => r.role.key);
  if (roleKeys.includes("admin")) return;
  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: actorId } }
  });
  if (!instructor) {
    throw new ApiError("forbidden", "Вы не являетесь преподавателем этого курса", 403);
  }
}

function toBuilderDetail(course: Record<string, unknown>): CourseBuilderDetail {
  const c = course as {
    id: string; slug: string; title: string; description: string;
    goal?: string | null; coverUrl?: string | null;
    durationHours: number; status: string; traversalMode: string;
    completionThreshold: number;
    modules: Array<Record<string, unknown>>;
  };
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    goal: c.goal,
    coverUrl: c.coverUrl,
    durationHours: c.durationHours,
    status: c.status as CourseBuilderDetail["status"],
    traversalMode: c.traversalMode as CourseBuilderDetail["traversalMode"],
    completionThreshold: c.completionThreshold,
    modules: (c.modules ?? []).map(toBuilderModule),
  };
}

function toBuilderModule(m: Record<string, unknown>): BuilderModuleDetail {
  const mod = m as {
    id: string; order: number; title: string;
    description?: string | null; recommendedDays: number;
    status: string;
    lessons: Array<Record<string, unknown>>;
  };
  return {
    id: mod.id,
    order: mod.order,
    title: mod.title,
    description: mod.description,
    recommendedDays: mod.recommendedDays,
    status: mod.status as BuilderModuleDetail["status"],
    lessons: (mod.lessons ?? []).map(toBuilderLesson),
  };
}

function toBuilderLesson(l: Record<string, unknown>): BuilderLessonDetail {
  const lesson = l as {
    id: string; order: number; title: string; type: string;
    summary?: string | null; durationMinutes: number;
    isRequired: boolean; blockId?: string | null;
    content: Record<string, unknown>; videoUrl?: string | null;
    quizzes: Array<Record<string, unknown>>;
    assignments: Array<Record<string, unknown>>;
  };
  return {
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    type: lesson.type as BuilderLessonDetail["type"],
    summary: lesson.summary,
    durationMinutes: lesson.durationMinutes,
    isRequired: lesson.isRequired,
    blockId: lesson.blockId,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    quizzes: lesson.quizzes.map((q: Record<string, unknown>) => ({
      id: q.id as string,
      title: q.title as string,
      passThreshold: q.passThreshold as number,
      maxAttempts: q.maxAttempts as number,
      questionsCount: (q as { questions?: unknown[] }).questions?.length ?? 0,
    })),
    assignments: lesson.assignments.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      deadline: a.deadline as string | undefined | null,
      maxAttempts: a.maxAttempts as number,
      submissionStatus: null,
    })),
  };
}

export async function getCourseForBuilder(courseId: string, actorId: string): Promise<CourseBuilderDetail> {
  await assertInstructorOfCourse(actorId, courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: { quizzes: { include: { questions: true } }, assignments: true },
          },
        },
      },
    },
  });
  if (!course) throw new ApiError("not_found", "Курс не найден", 404);
  return toBuilderDetail(course as unknown as Record<string, unknown>);
}

export async function updateCourseSettings(
  courseId: string,
  input: {
    title?: string;
    description?: string;
    goal?: string | null;
    coverUrl?: string | null;
    durationHours?: number;
    traversalMode?: "sequential" | "open";
    completionThreshold?: number;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  },
  actorId: string
) {
  await assertInstructorOfCourse(actorId, courseId);
  const statusDates =
    input.status === "PUBLISHED"
      ? { publishedAt: new Date(), archivedAt: null }
      : input.status === "ARCHIVED"
        ? { archivedAt: new Date() }
        : {};
  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...input,
      completionThreshold: input.completionThreshold,
      status: input.status ? CourseStatus[input.status] : undefined,
      ...statusDates,
    },
  });
  await logAudit({ actorId, action: "course.updated", entity: "course", entityId: course.id, metadata: input as Record<string, unknown> });
  return course;
}

export async function createModule(
  courseId: string,
  input: { title: string; description?: string; order: number; recommendedDays: number },
  actorId: string
) {
  await assertInstructorOfCourse(actorId, courseId);
  const mod = await prisma.module.create({
    data: { courseId, title: input.title, description: input.description, order: input.order, recommendedDays: input.recommendedDays },
  });
  await logAudit({ actorId, action: "module.created", entity: "module", entityId: mod.id });
  return mod;
}

export async function updateModule(
  moduleId: string,
  input: { title?: string; description?: string | null; order?: number; recommendedDays?: number; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" },
  actorId: string
) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { ...input, status: input.status ? CourseStatus[input.status] : undefined },
  });
  await logAudit({ actorId, action: "module.updated", entity: "module", entityId: moduleId, metadata: input as Record<string, unknown> });
  return updated;
}

export async function deleteModule(moduleId: string, actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  await prisma.module.delete({ where: { id: moduleId } });
  await logAudit({ actorId, action: "module.deleted", entity: "module", entityId: moduleId });
}

export async function reorderModules(courseId: string, moduleIds: string[], actorId: string) {
  await assertInstructorOfCourse(actorId, courseId);
  await prisma.$transaction(moduleIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index } })));
  await logAudit({ actorId, action: "modules.reordered", entity: "course", entityId: courseId, metadata: { moduleIds } });
}

export async function createLesson(
  moduleId: string,
  input: {
    title: string;
    summary?: string | null;
    order: number;
    type: keyof typeof LessonType;
    content?: Record<string, unknown>;
    videoUrl?: string | null;
    durationMinutes?: number;
    isRequired?: boolean;
  },
  actorId: string
) {
  const courseModule = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!courseModule) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, courseModule.courseId);
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: input.title,
      summary: input.summary,
      order: input.order,
      type: LessonType[input.type],
      content: toJsonValue(input.content ?? {}),
      videoUrl: input.videoUrl,
      durationMinutes: input.durationMinutes ?? 0,
      isRequired: input.isRequired ?? true,
    },
  });
  await logAudit({ actorId, action: "lesson.created", entity: "lesson", entityId: lesson.id });
  return lesson;
}

export async function updateLesson(
  lessonId: string,
  input: {
    title?: string;
    summary?: string | null;
    order?: number;
    type?: keyof typeof LessonType;
    content?: Record<string, unknown>;
    videoUrl?: string | null;
    durationMinutes?: number;
    isRequired?: boolean;
  },
  actorId: string
) {
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!existing) throw new ApiError("not_found", "Урок не найден", 404);
  await assertInstructorOfCourse(actorId, existing.module.courseId);
  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...input,
      type: input.type ? LessonType[input.type] : undefined,
      content: input.content ? toJsonValue(input.content) : undefined,
    },
  });
  await logAudit({ actorId, action: "lesson.updated", entity: "lesson", entityId: lessonId, metadata: input as Record<string, unknown> });
  return updated;
}

export async function deleteLesson(lessonId: string, actorId: string) {
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!existing) throw new ApiError("not_found", "Урок не найден", 404);
  await assertInstructorOfCourse(actorId, existing.module.courseId);
  await prisma.lesson.delete({ where: { id: lessonId } });
  await logAudit({ actorId, action: "lesson.deleted", entity: "lesson", entityId: lessonId });
}

export async function reorderLessons(moduleId: string, lessonIds: string[], actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  await prisma.$transaction(lessonIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index } })));
  await logAudit({ actorId, action: "lessons.reordered", entity: "module", entityId: moduleId, metadata: { lessonIds } });
}

export async function updateLessonBlocks(lessonId: string, blocks: ContentBlock[], actorId: string) {
  const existing = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!existing) throw new ApiError("not_found", "Урок не найден", 404);
  await assertInstructorOfCourse(actorId, existing.module.courseId);
  const currentContent = (existing.content as Record<string, unknown>) ?? {};
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { content: toJsonValue({ ...currentContent, blocks }) },
  });
  await logAudit({ actorId, action: "lesson.blocks.updated", entity: "lesson", entityId: lessonId });
}

export async function createQuizInline(
  lessonId: string,
  input: {
    title: string;
    description?: string;
    passThreshold: number;
    maxAttempts: number;
    questions: Array<{ type: string; prompt: string; options: string[]; correctAnswer: string; points: number }>;
    courseId: string;
  },
  actorId: string
) {
  await assertInstructorOfCourse(actorId, input.courseId);
  const quiz = await prisma.quiz.create({
    data: {
      courseId: input.courseId,
      lessonId,
      title: input.title,
      description: input.description,
      passThreshold: input.passThreshold,
      maxAttempts: input.maxAttempts,
      questions: {
        create: input.questions.map((q, i) => ({
          type: q.type.toUpperCase() as never,
          prompt: q.prompt,
          options: toJsonValue(q.options),
          correctAnswer: toJsonValue(q.correctAnswer),
          points: q.points,
          order: i,
        })),
      },
    },
    include: { questions: true },
  });
  await logAudit({ actorId, action: "quiz.created", entity: "quiz", entityId: quiz.id });
  return quiz;
}

export async function createAssignmentInline(
  lessonId: string,
  input: {
    title: string;
    instructions: string;
    maxAttempts: number;
    maxScore: number;
    deadline?: string;
    courseId: string;
  },
  actorId: string
) {
  await assertInstructorOfCourse(actorId, input.courseId);
  const assignment = await prisma.assignment.create({
    data: {
      courseId: input.courseId,
      lessonId,
      title: input.title,
      instructions: input.instructions,
      maxAttempts: input.maxAttempts,
      maxScore: input.maxScore,
      deadline: input.deadline ? new Date(input.deadline) : null,
    },
  });
  await logAudit({ actorId, action: "assignment.created", entity: "assignment", entityId: assignment.id });
  return assignment;
}
