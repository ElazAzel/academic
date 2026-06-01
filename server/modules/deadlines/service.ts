import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

export interface BlockDeadlineInput {
  blockId?: string;
  moduleId?: string;
  dueAt: Date;
}

type DeadlineTargetRow = {
  id: string;
  targetType: "block" | "module";
  title: string;
  order: number;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  deadline: { id: string; dueAt: Date } | null;
};

type CohortDeadlineScope = {
  courseId: string | null;
};

async function assertCanManageCohortDeadlines(
  cohort: CohortDeadlineScope,
  actorId: string,
) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    include: { roles: { include: { role: { select: { key: true } } } } },
  });
  if (!actor) throw new ApiError("unauthorized", "Пользователь не найден", 401);

  const roleKeys = actor.roles.map((r) => r.role.key);
  if (roleKeys.includes("admin")) return;

  if (!roleKeys.includes("instructor") || !cohort.courseId) {
    throw new ApiError("forbidden", "Недостаточно прав", 403);
  }

  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId: cohort.courseId, userId: actorId } },
  });
  if (!instructor) {
    throw new ApiError("forbidden", "Вы не преподаватель этого курса", 403);
  }
}

/**
 * Get all block deadlines for a cohort with block details.
 */
export async function getCohortBlockDeadlines(
  cohortId: string,
  actorId: string,
) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: {
      id: true,
      name: true,
      courseId: true,
    },
  });
  if (!cohort) throw new ApiError("not_found", "Поток не найден", 404);

  await assertCanManageCohortDeadlines(cohort, actorId);

  const modules = await prisma.module.findMany({
    where: { courseId: cohort.courseId! },
    include: {
      deadlines: {
        where: { cohortId },
        select: { id: true, dueAt: true },
      },
      blocks: {
        include: {
          deadlines: {
            where: { cohortId },
            select: { id: true, dueAt: true },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return modules.flatMap<DeadlineTargetRow>((courseModule) => {
    if (courseModule.blocks.length === 0) {
      return [
        {
          id: courseModule.id,
          targetType: "module" as const,
          title: courseModule.title,
          order: courseModule.order,
          moduleId: courseModule.id,
          moduleTitle: courseModule.title,
          moduleOrder: courseModule.order,
          deadline: courseModule.deadlines[0] ?? null,
        },
      ];
    }

    return courseModule.blocks.map((block) => ({
      id: block.id,
      targetType: "block" as const,
      title: block.title,
      order: block.order,
      moduleId: courseModule.id,
      moduleTitle: courseModule.title,
      moduleOrder: courseModule.order,
      deadline: block.deadlines[0] ?? null,
    }));
  });
}

/**
 * Upsert (set or update) block deadlines for a cohort.
 */
export async function setBlockDeadlines(
  cohortId: string,
  deadlines: BlockDeadlineInput[],
  actorId: string,
) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: { id: true, courseId: true },
  });
  if (!cohort) throw new ApiError("not_found", "Поток не найден", 404);

  await assertCanManageCohortDeadlines(cohort, actorId);

  // Upsert each deadline
  const results = [];
  for (const d of deadlines) {
    if (d.blockId) {
      const block = await prisma.block.findFirst({
        where: { id: d.blockId, module: { courseId: cohort.courseId! } },
        select: { id: true },
      });
      if (!block)
        throw new ApiError("not_found", "Блок не найден в курсе потока", 404);

      const existing = await prisma.blockCohortDeadline.findUnique({
        where: { cohortId_blockId: { cohortId, blockId: d.blockId } },
      });

      if (existing) {
        const updated = await prisma.blockCohortDeadline.update({
          where: { id: existing.id },
          data: { dueAt: d.dueAt },
        });
        results.push(updated);
      } else {
        const created = await prisma.blockCohortDeadline.create({
          data: {
            cohortId,
            blockId: d.blockId,
            dueAt: d.dueAt,
          },
        });
        results.push(created);
      }
      continue;
    }

    if (d.moduleId) {
      const courseModule = await prisma.module.findFirst({
        where: { id: d.moduleId, courseId: cohort.courseId! },
        select: { id: true },
      });
      if (!courseModule)
        throw new ApiError("not_found", "Модуль не найден в курсе потока", 404);

      const existing = await prisma.cohortDeadline.findUnique({
        where: { cohortId_moduleId: { cohortId, moduleId: d.moduleId } },
      });

      if (existing) {
        const updated = await prisma.cohortDeadline.update({
          where: { id: existing.id },
          data: { dueAt: d.dueAt },
        });
        results.push(updated);
      } else {
        const created = await prisma.cohortDeadline.create({
          data: {
            cohortId,
            moduleId: d.moduleId,
            dueAt: d.dueAt,
          },
        });
        results.push(created);
      }
      continue;
    }

    throw new ApiError(
      "bad_request",
      "Укажите блок или модуль для дедлайна",
      400,
    );
  }

  return results;
}

/**
 * Delete a specific block deadline.
 */
export async function deleteBlockDeadline(deadlineId: string) {
  const deadline = await prisma.blockCohortDeadline.findUnique({
    where: { id: deadlineId },
  });
  if (!deadline) throw new ApiError("not_found", "Дедлайн не найден", 404);

  await prisma.blockCohortDeadline.delete({ where: { id: deadlineId } });
  return { success: true };
}

/**
 * Get upcoming/overdue deadlines for a curator's students.
 */
export async function getCuratorDeadlineAlerts(curatorId: string) {
  // Find all students assigned to this curator
  const assignments = await prisma.curatorAssignment.findMany({
    where: { curatorId, active: true },
    select: {
      studentId: true,
      cohortId: true,
      student: { select: { id: true, name: true, email: true } },
      cohort: {
        select: {
          id: true,
          name: true,
          course: { select: { title: true } },
        },
      },
    },
  });

  if (assignments.length === 0) return [];

  const now = new Date();
  const alerts: Array<{
    studentId: string;
    studentName: string;
    cohortId: string;
    cohortName: string;
    courseTitle: string;
    blockId: string;
    blockTitle: string;
    dueAt: string;
    daysLeft: number;
    isOverdue: boolean;
  }> = [];

  for (const assignment of assignments) {
    const deadlines = await prisma.blockCohortDeadline.findMany({
      where: { cohortId: assignment.cohortId },
      include: { block: { select: { id: true, title: true } } },
    });

    for (const dl of deadlines) {
      const daysLeft = Math.ceil(
        (dl.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft > 14) continue; // Only show if within 2 weeks or overdue

      alerts.push({
        studentId: assignment.studentId,
        studentName: assignment.student.name ?? assignment.student.email,
        cohortId: assignment.cohortId,
        cohortName: assignment.cohort.name,
        courseTitle: assignment.cohort.course?.title ?? "",
        blockId: dl.block.id,
        blockTitle: dl.block.title,
        dueAt: dl.dueAt.toISOString(),
        daysLeft,
        isOverdue: daysLeft < 0,
      });
    }
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

export async function getInstructorCoursesForDeadlines(instructorId: string) {
  return prisma.course.findMany({
    where: {
      instructors: { some: { userId: instructorId } },
    },
    select: {
      id: true,
      title: true,
      cohorts: {
        where: { status: { not: "archived" } },
        select: { id: true, name: true },
      },
    },
    orderBy: { title: "asc" },
  });
}
