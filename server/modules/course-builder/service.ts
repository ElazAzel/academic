import { randomUUID } from "node:crypto";
import { CourseStatus, LessonType, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { getCourseBuilderPublishChecks, isCourseBuilderReadyToPublish } from "@/lib/course-builder-readiness";
import { courseBuilderSnapshotSchema } from "@/lib/validation";
import { logAudit } from "@/server/modules/audit/service";
import { assertInstructorOfCourse, createModule, updateModule, deleteModule, createLesson, updateLesson, deleteLesson, createBlock, updateBlock, deleteBlock } from "@/server/modules/courses/service";
import type { CourseBuilderDetail, BuilderModuleDetail, BuilderBlockDetail, BuilderLessonDetail, ContentBlock } from "@/types/domain";
import type { z } from "zod";

const prisma = getPrisma();
type CourseBuilderSnapshotInput = z.infer<typeof courseBuilderSnapshotSchema>;
type SnapshotModule = CourseBuilderSnapshotInput["modules"][number];
type SnapshotBlock = SnapshotModule["blocks"][number];
type SnapshotLesson = SnapshotModule["lessons"][number] & { blockId: string | null };
type NormalizedSnapshotBlock = Omit<SnapshotBlock, "lessons"> & { lessons: SnapshotLesson[] };
type NormalizedSnapshotModule = Omit<SnapshotModule, "blocks" | "lessons"> & {
  blocks: NormalizedSnapshotBlock[];
  lessons: SnapshotLesson[];
};

const TEMP_ORDER_OFFSET = 1_000_000_000;

export { assertInstructorOfCourse, createModule, updateModule, deleteModule, createLesson, updateLesson, deleteLesson, createBlock, updateBlock, deleteBlock };

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
    blocks: Array<Record<string, unknown>>;
    lessons: Array<Record<string, unknown>>;
  };
  return {
    id: mod.id,
    order: mod.order,
    title: mod.title,
    description: mod.description,
    recommendedDays: mod.recommendedDays,
    status: mod.status as BuilderModuleDetail["status"],
    blocks: (mod.blocks ?? []).map(toBuilderBlock),
    lessons: (mod.lessons ?? []).filter((lesson) => !lesson.blockId).map(toBuilderLesson),
  };
}

function normalizeSnapshotOrder(modules: SnapshotModule[]): NormalizedSnapshotModule[] {
  return modules.map((mod, moduleIndex) => {
    let nextLessonOrder = 0;
    return {
      ...mod,
      order: moduleIndex,
      blocks: mod.blocks.map((block, blockIndex) => ({
        ...block,
        order: blockIndex,
        lessons: block.lessons.map((lesson) => ({
          ...lesson,
          order: nextLessonOrder++,
          blockId: block.id,
        })),
      })),
      lessons: mod.lessons.map((lesson) => ({
        ...lesson,
        order: nextLessonOrder++,
        blockId: null,
      })),
    };
  });
}

function assertSnapshotHasUniqueIds(modules: NormalizedSnapshotModule[]) {
  const moduleIds = new Set<string>();
  const blockIds = new Set<string>();
  const lessonIds = new Set<string>();

  for (const mod of modules) {
    if (moduleIds.has(mod.id)) throw new ApiError("bad_request", "Модуль повторяется в снимке курса", 400);
    moduleIds.add(mod.id);

    for (const block of mod.blocks) {
      if (blockIds.has(block.id)) throw new ApiError("bad_request", "Блок повторяется в снимке курса", 400);
      blockIds.add(block.id);

      for (const lesson of block.lessons) {
        if (lessonIds.has(lesson.id)) throw new ApiError("bad_request", "Урок повторяется в снимке курса", 400);
        lessonIds.add(lesson.id);
      }
    }

    for (const lesson of mod.lessons) {
      if (lessonIds.has(lesson.id)) throw new ApiError("bad_request", "Урок повторяется в снимке курса", 400);
      lessonIds.add(lesson.id);
    }
  }
}

async function rewriteOrdersWithoutUniqueCollisions(
  tx: Prisma.TransactionClient,
  ids: string[],
  updateOrder: (tx: Prisma.TransactionClient, id: string, order: number) => Promise<unknown>,
) {
  for (const [index, id] of ids.entries()) {
    await updateOrder(tx, id, TEMP_ORDER_OFFSET + index);
  }
  for (const [index, id] of ids.entries()) {
    await updateOrder(tx, id, index);
  }
}

function toBuilderBlock(b: Record<string, unknown>): BuilderBlockDetail {
  const block = b as {
    id: string; order: number; title: string;
    description?: string | null;
    lessons: Array<Record<string, unknown>>;
  };
  return {
    id: block.id,
    order: block.order,
    title: block.title,
    description: block.description,
    lessons: (block.lessons ?? []).map(toBuilderLesson),
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
          blocks: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                include: { quizzes: { include: { questions: true } }, assignments: true },
              },
            },
          },
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
  if (input.status === "PUBLISHED") {
    await assertCourseReadyToPublish(courseId, actorId);
  }
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

async function assertCourseReadyToPublish(courseId: string, actorId: string) {
  const detail = await getCourseForBuilder(courseId, actorId);
  const checks = getCourseBuilderPublishChecks(detail);
  if (!isCourseBuilderReadyToPublish(detail)) {
    throw new ApiError(
      "bad_request",
      `Курс не готов к публикации: ${checks.filter((check) => check.status === "failed").map((check) => check.label).join(", ")}`,
      400,
    );
  }
}

export async function publishCourseFromBuilder(courseId: string, actorId: string) {
  await assertCourseReadyToPublish(courseId, actorId);
  const course = await prisma.course.update({
    where: { id: courseId },
    data: { status: CourseStatus.PUBLISHED, publishedAt: new Date(), archivedAt: null },
  });
  await logAudit({ actorId, action: "course.published", entity: "course", entityId: courseId });
  return course;
}

export async function saveCourseBuilderSnapshot(courseId: string, input: CourseBuilderSnapshotInput, actorId: string) {
  const parsed = courseBuilderSnapshotSchema.parse(input);
  const normalizedModules = normalizeSnapshotOrder(parsed.modules);
  assertSnapshotHasUniqueIds(normalizedModules);
  await assertInstructorOfCourse(actorId, courseId);

  const existing = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      modules: {
        select: {
          id: true,
          blocks: { select: { id: true, moduleId: true } },
          lessons: { select: { id: true, moduleId: true } },
        },
      },
    },
  });
  if (!existing) throw new ApiError("not_found", "Курс не найден", 404);

  const moduleIds = new Set(existing.modules.map((mod) => mod.id));
  const blockModuleById = new Map(existing.modules.flatMap((mod) => mod.blocks.map((block) => [block.id, block.moduleId] as const)));
  const lessonModuleById = new Map(existing.modules.flatMap((mod) => mod.lessons.map((lesson) => [lesson.id, lesson.moduleId] as const)));

  for (const mod of normalizedModules) {
    if (!moduleIds.has(mod.id)) {
      throw new ApiError("forbidden", "Модуль не принадлежит этому курсу", 403);
    }
    for (const block of mod.blocks) {
      if (blockModuleById.get(block.id) !== mod.id) {
        throw new ApiError("forbidden", "Блок не принадлежит этому курсу", 403);
      }
      for (const lesson of block.lessons) {
        if (lessonModuleById.get(lesson.id) !== mod.id) {
          throw new ApiError("forbidden", "Урок не принадлежит этому курсу или модулю", 403);
        }
      }
    }
    for (const lesson of mod.lessons) {
      if (lessonModuleById.get(lesson.id) !== mod.id) {
        throw new ApiError("forbidden", "Урок не принадлежит этому курсу", 403);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: {
        title: parsed.title,
        description: parsed.description,
        goal: parsed.goal || null,
        coverUrl: parsed.coverUrl || null,
        durationHours: parsed.durationHours,
        traversalMode: parsed.traversalMode,
        completionThreshold: parsed.completionThreshold,
      },
    });

    for (const [index, mod] of normalizedModules.entries()) {
      await tx.module.update({ where: { id: mod.id }, data: { order: TEMP_ORDER_OFFSET + index } });
    }

    for (const mod of normalizedModules) {
      for (const [index, block] of mod.blocks.entries()) {
        await tx.block.update({ where: { id: block.id }, data: { order: TEMP_ORDER_OFFSET + index } });
      }

      const lessons = [...mod.blocks.flatMap((block) => block.lessons), ...mod.lessons];
      for (const [index, lesson] of lessons.entries()) {
        await tx.lesson.update({ where: { id: lesson.id }, data: { order: TEMP_ORDER_OFFSET + index } });
      }
    }

    for (const mod of normalizedModules) {
      await tx.module.update({
        where: { id: mod.id },
        data: {
          title: mod.title,
          description: mod.description ?? null,
          order: mod.order,
          recommendedDays: mod.recommendedDays,
          status: mod.status ? CourseStatus[mod.status] : undefined,
        },
      });

      for (const block of mod.blocks) {
        await tx.block.update({
          where: { id: block.id },
          data: {
            title: block.title,
            description: block.description ?? null,
            order: block.order,
          },
        });
      }

      for (const block of mod.blocks) {
        for (const lesson of block.lessons) {
          await tx.lesson.update({
            where: { id: lesson.id },
            data: {
              title: lesson.title,
              summary: lesson.summary ?? null,
              order: lesson.order,
              type: LessonType[lesson.type],
              videoUrl: lesson.videoUrl || null,
              durationMinutes: lesson.durationMinutes,
              isRequired: lesson.isRequired,
              blockId: block.id,
            },
          });
        }
      }

      for (const lesson of mod.lessons) {
        await tx.lesson.update({
          where: { id: lesson.id },
          data: {
            title: lesson.title,
            summary: lesson.summary ?? null,
            order: lesson.order,
            type: LessonType[lesson.type],
            videoUrl: lesson.videoUrl || null,
            durationMinutes: lesson.durationMinutes,
            isRequired: lesson.isRequired,
            blockId: null,
          },
        });
      }
    }
  });

  await logAudit({ actorId, action: "course.builder.snapshot_saved", entity: "course", entityId: courseId });
  return getCourseForBuilder(courseId, actorId);
}

export async function cloneModule(moduleId: string, actorId: string): Promise<BuilderModuleDetail> {
  const source = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      blocks: { include: { lessons: true } },
      lessons: true,
      course: { select: { id: true } },
    },
  });
  if (!source) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, source.course.id);

  const newModuleId = randomUUID();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Create module
    await tx.module.create({
      data: {
        id: newModuleId,
        courseId: source.course.id,
        title: `${source.title} (копия)`,
        description: source.description,
        order: source.order + 1,
        recommendedDays: source.recommendedDays,
        status: source.status,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Clone blocks (if any) with their lessons
    for (const block of source.blocks) {
      const newBlockId = randomUUID();
      await tx.block.create({
        data: {
          id: newBlockId,
          moduleId: newModuleId,
          title: block.title,
          description: block.description,
          order: block.order,
          createdAt: now,
          updatedAt: now,
        },
      });

      for (const lesson of block.lessons) {
        const newLessonId = randomUUID();
        await tx.lesson.create({
          data: {
            id: newLessonId,
            moduleId: newModuleId,
            blockId: newBlockId,
            title: lesson.title,
            summary: lesson.summary,
            type: lesson.type,
            order: lesson.order,
            durationMinutes: lesson.durationMinutes,
            isRequired: lesson.isRequired,
            videoUrl: lesson.videoUrl,
            content: lesson.content ?? {},
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    // Clone root-level lessons (without block)
    for (const lesson of source.lessons) {
      const newLessonId = randomUUID();
      await tx.lesson.create({
        data: {
          id: newLessonId,
          moduleId: newModuleId,
          title: lesson.title,
          summary: lesson.summary,
          type: lesson.type,
          order: lesson.order,
          durationMinutes: lesson.durationMinutes,
          isRequired: lesson.isRequired,
          videoUrl: lesson.videoUrl,
          content: lesson.content ?? {},
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  });

  // Shift orders of subsequent modules in the same course
  await prisma.$transaction(async (tx) => {
    const siblings = await tx.module.findMany({
      where: { courseId: source.course.id, id: { not: source.id } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    let order = 0;
    for (const sib of siblings) {
      if (sib.order > source.order) {
        await tx.module.update({ where: { id: sib.id }, data: { order: ++order + source.order } });
      }
    }
  });

  await logAudit({ actorId, action: "module.cloned", entity: "module", entityId: newModuleId, metadata: { sourceId: moduleId, courseId: source.course.id } });

  // Fetch and return the new module as BuilderModuleDetail
  const result = await prisma.module.findUnique({
    where: { id: newModuleId },
    include: {
      blocks: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      lessons: { orderBy: { order: "asc" }, where: { blockId: null } },
    },
  });
  return toBuilderModule(result as unknown as Record<string, unknown>);
}

export async function reorderModules(courseId: string, moduleIds: string[], actorId: string) {
  await assertInstructorOfCourse(actorId, courseId);
  await prisma.$transaction(async (tx) => {
    await rewriteOrdersWithoutUniqueCollisions(tx, moduleIds, (client, id, order) =>
      client.module.update({ where: { id }, data: { order } }),
    );
  });
  await logAudit({ actorId, action: "modules.reordered", entity: "course", entityId: courseId, metadata: { moduleIds } });
}

export async function reorderLessons(moduleId: string, lessonIds: string[], actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  await prisma.$transaction(async (tx) => {
    await rewriteOrdersWithoutUniqueCollisions(tx, lessonIds, (client, id, order) =>
      client.lesson.update({ where: { id }, data: { order } }),
    );
  });
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

async function assertLessonBelongsToCourse(lessonId: string, courseId: string, actorId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true } } },
  });
  if (!lesson) throw new ApiError("not_found", "Урок не найден", 404);
  if (lesson.module.courseId !== courseId) {
    throw new ApiError("forbidden", "Урок не принадлежит выбранному курсу", 403);
  }
  await assertInstructorOfCourse(actorId, courseId);
}

async function appendLessonContentBlock(lessonId: string, block: ContentBlock) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { content: true } });
  if (!lesson) throw new ApiError("not_found", "Урок не найден", 404);
  const content = (lesson.content as Record<string, unknown>) ?? {};
  const blocks = Array.isArray(content.blocks) ? (content.blocks as ContentBlock[]) : [];
  const alreadyLinked = blocks.some((existingBlock) => {
    if (block.type === "quiz" && existingBlock.type === "quiz") {
      return existingBlock.data.quizId === block.data.quizId;
    }
    if (block.type === "assignment" && existingBlock.type === "assignment") {
      return existingBlock.data.assignmentId === block.data.assignmentId;
    }
    return false;
  });
  if (alreadyLinked) return;
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { content: toJsonValue({ ...content, blocks: [...blocks, block] }) },
  });
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
  await assertLessonBelongsToCourse(lessonId, input.courseId, actorId);
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
  await appendLessonContentBlock(lessonId, {
    id: randomUUID(),
    type: "quiz",
    data: { quizId: quiz.id },
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
  await assertLessonBelongsToCourse(lessonId, input.courseId, actorId);
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
  await appendLessonContentBlock(lessonId, {
    id: randomUUID(),
    type: "assignment",
    data: { assignmentId: assignment.id },
  });
  await logAudit({ actorId, action: "assignment.created", entity: "assignment", entityId: assignment.id });
  return assignment;
}
