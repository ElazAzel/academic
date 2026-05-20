import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

export interface BlockDeadlineInput {
  blockId: string;
  dueAt: Date;
}

/**
 * Get all block deadlines for a cohort with block details.
 */
export async function getCohortBlockDeadlines(cohortId: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    select: {
      id: true,
      name: true,
      courseId: true,
    },
  });
  if (!cohort) throw new ApiError("not_found", "Поток не найден", 404);

  // Get all blocks in the course with module info
  const blocks = await prisma.block.findMany({
    where: {
      module: {
        courseId: cohort.courseId!,
      },
    },
    include: {
      module: { select: { id: true, title: true, order: true } },
      deadlines: {
        where: { cohortId },
        select: { id: true, dueAt: true },
      },
    },
    orderBy: [
      { module: { order: "asc" } },
      { order: "asc" },
    ],
  });

  return blocks.map((block) => ({
    id: block.id,
    title: block.title,
    order: block.order,
    moduleId: block.module.id,
    moduleTitle: block.module.title,
    moduleOrder: block.module.order,
    deadline: block.deadlines[0] ?? null,
  }));
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

  // Verify actor is admin or instructor of the course
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    include: { roles: { include: { role: { select: { key: true } } } } },
  });
  if (!actor) throw new ApiError("unauthorized", "Пользователь не найден", 401);

  const roleKeys = actor.roles.map((r) => r.role.key);
  const isAdmin = roleKeys.includes("admin");
  const isInstructor = roleKeys.includes("instructor");

  if (!isAdmin) {
    if (!isInstructor || !cohort.courseId) {
      throw new ApiError("forbidden", "Недостаточно прав", 403);
    }
    const instructor = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId: cohort.courseId, userId: actorId } },
    });
    if (!instructor) {
      throw new ApiError("forbidden", "Вы не преподаватель этого курса", 403);
    }
  }

  // Upsert each deadline
  const results = [];
  for (const d of deadlines) {
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
      const daysLeft = Math.ceil((dl.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
