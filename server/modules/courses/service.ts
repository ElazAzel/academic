import { cache } from "react";
import { CourseStatus, LessonType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toJsonValue } from "@/lib/json";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function assertInstructorOfCourse(actorId: string, courseId: string) {
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

export const listCourses = cache(async (status?: CourseStatus, instructorId?: string) => {
  return prisma.course.findMany({
    take: 50,
    where: {
      ...(status ? { status } : {}),
      ...(instructorId ? { instructors: { some: { userId: instructorId } } } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } }
      },
      instructors: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });
});

export const getCourse = cache(async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      goal: true,
      coverUrl: true,
      durationHours: true,
      status: true,
      traversalMode: true,
      completionThreshold: true,
      publishedAt: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          description: true,
          recommendedDays: true,
          status: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              type: true,
              summary: true,
              durationMinutes: true,
              isRequired: true,
              quizzes: true,
              assignments: true
            }
          },
          deadlines: true
        }
      },
      cohorts: {
        select: {
          id: true,
          name: true,
          status: true,
          startsAt: true,
          endsAt: true
        }
      },
      instructors: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });
  if (!course) {
    throw new ApiError("not_found", "Курс не найден", 404);
  }
  return course;
});

export async function createCourse(input: {
  title: string;
  description: string;
  goal?: string;
  coverUrl?: string;
  durationHours: number;
  traversalMode: "sequential" | "open";
}, actorId: string, actorRoles?: string[]) {
  const baseSlug = slugify(input.title);
  const slug = `${baseSlug || "course"}-${Date.now().toString(36)}`;
  const isAdmin = actorRoles?.includes("admin") ?? false;
  const course = await prisma.course.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      goal: input.goal,
      coverUrl: input.coverUrl,
      durationHours: input.durationHours,
      traversalMode: input.traversalMode,
      ...(isAdmin ? {} : {
        instructors: { create: { userId: actorId } }
      })
    }
  });
  await logAudit({ actorId, action: "course.created", entity: "course", entityId: course.id });
  return course;
}

export async function updateCourse(courseId: string, input: {
  title?: string;
  description?: string;
  goal?: string;
  coverUrl?: string;
  durationHours?: number;
  traversalMode?: "sequential" | "open";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}, actorId: string, actorRoles?: string[]) {
  const existing = await getCourse(courseId);
  const isAdmin = actorRoles?.includes("admin") ?? false;
  const isInstructor = existing.instructors.some((i) => i.userId === actorId);
  if (!isAdmin && !isInstructor) {
    throw new ApiError("forbidden", "Вы не являетесь преподавателем этого курса", 403);
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
      status: input.status ? CourseStatus[input.status] : undefined,
      ...statusDates
    }
  });
  await logAudit({ actorId, action: "course.updated", entity: "course", entityId: course.id, metadata: input });
  return course;
}

export async function createModule(courseId: string, input: {
  title: string;
  description?: string;
  order: number;
  recommendedDays: number;
}, actorId: string) {
  await getCourse(courseId);
  await assertInstructorOfCourse(actorId, courseId);
  const courseModule = await prisma.module.create({
    data: {
      courseId,
      title: input.title,
      description: input.description,
      order: input.order,
      recommendedDays: input.recommendedDays
    }
  });
  await logAudit({ actorId, action: "module.created", entity: "module", entityId: courseModule.id });
  return courseModule;
}

export async function updateModule(moduleId: string, input: {
  title?: string;
  description?: string;
  order?: number;
  recommendedDays?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}, actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  const courseModule = await prisma.module.update({
    where: { id: moduleId },
    data: {
      ...input,
      status: input.status ? CourseStatus[input.status] : undefined
    }
  });
  await logAudit({ actorId, action: "module.updated", entity: "module", entityId: courseModule.id, metadata: input });
  return courseModule;
}

export async function deleteModule(moduleId: string, actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, mod.courseId);
  const courseModule = await prisma.module.delete({ where: { id: moduleId } });
  await logAudit({ actorId, action: "module.deleted", entity: "module", entityId: moduleId });
  return courseModule;
}

export async function createLesson(moduleId: string, input: {
  title: string;
  summary?: string | null;
  order: number;
  type: keyof typeof LessonType;
  content: Record<string, unknown>;
  videoUrl?: string | null;
  durationMinutes: number;
  isRequired?: boolean;
  blockId?: string | null;
}, actorId: string) {
  const courseModule = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!courseModule) {
    throw new ApiError("not_found", "Модуль не найден", 404);
  }
  await assertInstructorOfCourse(actorId, courseModule.courseId);
  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      blockId: input.blockId ?? null,
      title: input.title,
      summary: input.summary,
      order: input.order,
      type: LessonType[input.type],
      content: toJsonValue(input.content),
      videoUrl: input.videoUrl,
      durationMinutes: input.durationMinutes,
      isRequired: input.isRequired ?? true
    }
  });
  await logAudit({ actorId, action: "lesson.created", entity: "lesson", entityId: lesson.id });
  return lesson;
}

export async function updateLesson(lessonId: string, input: {
  title?: string;
  summary?: string | null;
  order?: number;
  type?: keyof typeof LessonType;
  content?: Record<string, unknown>;
  videoUrl?: string | null;
  durationMinutes?: number;
  isRequired?: boolean;
  blockId?: string | null;
}, actorId: string) {
  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true }
  });
  if (!existing) throw new ApiError("not_found", "Урок не найден", 404);
  await assertInstructorOfCourse(actorId, existing.module.courseId);
  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...input,
      type: input.type ? LessonType[input.type] : undefined,
      content: input.content ? toJsonValue(input.content) : undefined
    }
  });
  await logAudit({ actorId, action: "lesson.updated", entity: "lesson", entityId: lessonId, metadata: input });
  return updated;
}

export async function deleteLesson(lessonId: string, actorId: string) {
  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true }
  });
  if (!existing) throw new ApiError("not_found", "Урок не найден", 404);
  await assertInstructorOfCourse(actorId, existing.module.courseId);
  const deleted = await prisma.lesson.delete({ where: { id: lessonId } });
  await logAudit({ actorId, action: "lesson.deleted", entity: "lesson", entityId: lessonId });
  return deleted;
}

export async function getLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      media: true,
      quizzes: { include: { questions: true } },
      assignments: true,
      questions: true
    }
  });
  if (!lesson) {
    throw new ApiError("not_found", "Урок не найден", 404);
  }
  return lesson;
}

export async function getModule(moduleId: string) {
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: true,
      blocks: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      lessons: { orderBy: { order: "asc" } }
    }
  });
  if (!courseModule) {
    throw new ApiError("not_found", "Модуль не найден", 404);
  }
  return courseModule;
}

// ── Block CRUD ───────────────────────────────────────────────────────

export async function createBlock(moduleId: string, input: {
  title: string;
  description?: string;
  order: number;
}, actorId: string) {
  const courseModule = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!courseModule) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, courseModule.courseId);
  const block = await prisma.block.create({
    data: { moduleId, title: input.title, description: input.description, order: input.order }
  });
  await logAudit({ actorId, action: "block.created", entity: "block", entityId: block.id });
  return block;
}

export async function updateBlock(blockId: string, input: {
  title?: string;
  description?: string;
  order?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}, actorId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { module: { select: { courseId: true } } }
  });
  if (!block) throw new ApiError("not_found", "Блок не найден", 404);
  await assertInstructorOfCourse(actorId, block.module.courseId);
  const updated = await prisma.block.update({
    where: { id: blockId },
    data: {
      ...input,
      status: input.status ? CourseStatus[input.status] : undefined
    }
  });
  await logAudit({ actorId, action: "block.updated", entity: "block", entityId: blockId, metadata: input });
  return updated;
}

export async function deleteBlock(blockId: string, actorId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { module: { select: { courseId: true } } }
  });
  if (!block) throw new ApiError("not_found", "Блок не найден", 404);
  await assertInstructorOfCourse(actorId, block.module.courseId);
  const deleted = await prisma.block.delete({ where: { id: blockId } });
  await logAudit({ actorId, action: "block.deleted", entity: "block", entityId: blockId });
  return deleted;
}

export async function getBlock(blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: {
      module: { include: { course: true } },
      lessons: { orderBy: { order: "asc" } }
    }
  });
  if (!block) throw new ApiError("not_found", "Блок не найден", 404);
  return block;
}

export async function listEnrollments(userId: string, roleKeys: string[]) {
  const isAdmin = roleKeys.includes("admin");
  const isInstructor = roleKeys.includes("instructor");

  const where: Record<string, unknown> = {};

  if (!isAdmin) {
    if (isInstructor) {
      where.course = {
        instructors: { some: { userId } }
      };
    } else {
      where.userId = userId;
    }
  }

  return prisma.enrollment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true } },
      cohort: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

export async function enrollStudent(input: {
  userId: string;
  courseId: string;
  cohortId?: string;
}, actorId: string) {
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } },
    update: { cohortId: input.cohortId, status: "ACTIVE" },
    create: {
      userId: input.userId,
      courseId: input.courseId,
      cohortId: input.cohortId,
      status: "ACTIVE"
    }
  });
  await logAudit({
    actorId,
    action: "enrollment.upserted",
    entity: "enrollment",
    entityId: enrollment.id,
    metadata: input
  });
  return enrollment;
}
