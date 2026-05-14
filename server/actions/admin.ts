"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { enrollStudent as enrollStudentService } from "@/server/modules/courses/service";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { RoleKey, UserAccountStatus } from "@prisma/client";

const prisma = getPrisma();

export async function enrollStudentAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);
    
    const userId = formData.get("userId") as string;
    const courseId = formData.get("courseId") as string;
    const cohortId = formData.get("cohortId") as string || undefined;
    const curatorId = formData.get("curatorId") as string || undefined;

    if (!userId || !courseId) {
      throw new Error("Не указан студент или курс");
    }

    if (curatorId && !cohortId) {
      throw new Error("Для назначения куратора необходимо выбрать поток (когорту)");
    }

    await enrollStudentService({ userId, courseId, cohortId }, actor.id);

    if (curatorId && cohortId) {
      await prisma.curatorAssignment.upsert({
        where: { 
          cohortId_studentId: { 
            cohortId,
            studentId: userId 
          } 
        },
        update: { curatorId, active: true },
        create: {
          curatorId,
          studentId: userId,
          cohortId,
          active: true
        }
      });
    }

    revalidatePath("/admin/enrollments");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function assignCuratorAction(input: { studentId: string; curatorId: string; cohortId: string }) {
  try {
    const actor = await requireRole(["admin"]);

    await prisma.curatorAssignment.upsert({
      where: { 
        cohortId_studentId: { 
          cohortId: input.cohortId, 
          studentId: input.studentId 
        } 
      },
      update: { curatorId: input.curatorId, active: true },
      create: {
        curatorId: input.curatorId,
        studentId: input.studentId,
        cohortId: input.cohortId,
        active: true
      }
    });

    await logAudit({
      actorId: actor.id,
      action: "curator.assigned",
      entity: "curator_assignment",
      entityId: `${input.cohortId}-${input.studentId}`,
      metadata: input
    });

    revalidatePath("/admin/enrollments");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function pauseEnrollmentAction(enrollmentId: string) {
  const actor = await requireRole(["admin"]);
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) throw new Error("Запись не найдена");
  if (enrollment.status !== "ACTIVE") throw new Error("Можно приостановить только активное зачисление");

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "PAUSED" }
  });

  await logAudit({
    actorId: actor.id,
    action: "enrollment.paused",
    entity: "enrollment",
    entityId: enrollmentId
  });

  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function resumeEnrollmentAction(enrollmentId: string) {
  const actor = await requireRole(["admin"]);
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) throw new Error("Запись не найдена");
  if (enrollment.status !== "PAUSED") throw new Error("Можно возобновить только приостановленное зачисление");

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "ACTIVE" }
  });

  await logAudit({
    actorId: actor.id,
    action: "enrollment.resumed",
    entity: "enrollment",
    entityId: enrollmentId
  });

  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function deleteEnrollmentAction(enrollmentId: string) {
  try {
    const actor = await requireRole(["admin"]);
    
    // Также удаляем привязку куратора, если она есть для этого студента в этом потоке
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (enrollment && enrollment.cohortId) {
      await prisma.curatorAssignment.deleteMany({
        where: { 
          studentId: enrollment.userId,
          cohortId: enrollment.cohortId
        }
      });
    }

    await prisma.enrollment.delete({
      where: { id: enrollmentId }
    });

    await logAudit({
      actorId: actor.id,
      action: "enrollment.deleted",
      entity: "enrollment",
      entityId: enrollmentId
    });

    revalidatePath("/admin/enrollments");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function assignCuratorFromSupervisorAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);

    const studentId = formData.get("studentId") as string;
    const curatorId = formData.get("curatorId") as string;
    const cohortId = formData.get("cohortId") as string;

    if (!studentId || !curatorId || !cohortId) {
      throw new Error("Студент, куратор и поток обязательны");
    }

    await prisma.curatorAssignment.upsert({
      where: { cohortId_studentId: { cohortId, studentId } },
      update: { curatorId, active: true, superCuratorId: actor.roles.includes("super_curator") ? actor.id : undefined },
      create: { curatorId, studentId, cohortId, active: true, superCuratorId: actor.roles.includes("super_curator") ? actor.id : undefined },
    });

    await logAudit({
      actorId: actor.id,
      action: "curator.assigned_from_supervisor",
      entity: "curator_assignment",
      entityId: `${cohortId}-${studentId}`,
      metadata: { curatorId, cohortId },
    });

    revalidatePath("/super-curator/distribution");
    revalidatePath("/super-curator");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function createCohortAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);
    const name = formData.get("name") as string;
    const courseId = formData.get("courseId") as string;
    const startsAt = formData.get("startsAt") as string || undefined;
    const endsAt = formData.get("endsAt") as string || undefined;

    if (!name || !courseId) {
      throw new Error("Название и курс обязательны");
    }

    await prisma.cohort.create({
      data: {
        name,
        courseId,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        status: "active"
      }
    });

    await logAudit({
      actorId: actor.id,
      action: "cohort.created",
      entity: "cohort",
      entityId: name,
      metadata: { courseId, startsAt, endsAt }
    });

    revalidatePath("/admin/cohorts");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function updateCohortAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const courseId = formData.get("courseId") as string;
    const startsAt = formData.get("startsAt") as string || undefined;
    const endsAt = formData.get("endsAt") as string || undefined;
    const status = formData.get("status") as string;

    if (!id || !name) {
      throw new Error("ID и название обязательны");
    }

    await prisma.cohort.update({
      where: { id },
      data: {
        name,
        ...(courseId && { courseId }),
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        status: status || "active"
      }
    });

    await logAudit({
      actorId: actor.id,
      action: "cohort.updated",
      entity: "cohort",
      entityId: id,
      metadata: { name, courseId, status }
    });

    revalidatePath("/admin/cohorts");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function deleteCohortAction(id: string) {
  try {
    const actor = await requireRole(["admin"]);

    await prisma.cohort.update({
      where: { id },
      data: { status: "archived" }
    });

    await logAudit({
      actorId: actor.id,
      action: "cohort.archived",
      entity: "cohort",
      entityId: id
    });

    revalidatePath("/admin/cohorts");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin", "super_curator"]);
    
    const email = formData.get("email") as string;
    const name = formData.get("name") as string || undefined;
    const roleKeys = formData.getAll("roles") as RoleKey[];

    if (!email) {
      throw new Error("Email обязателен");
    }

    const { createUser } = await import("@/server/modules/users/service");
    await createUser(actor, { email, name, roleKeys });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);
    const userId = formData.get("id") as string;
    const name = formData.get("name") as string;
    const status = formData.get("status") as string;

    if (!userId) throw new Error("ID пользователя обязателен");

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(status ? { status: status as UserAccountStatus } : {}),
      },
    });

    await logAudit({
      actorId: actor.id,
      action: "user.updated",
      entity: "user",
      entityId: userId,
      metadata: { name, status },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const actor = await requireRole(["admin"]);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Пользователь не найден");

    await prisma.user.update({
      where: { id: userId },
      data: { status: UserAccountStatus.DELETED },
    });

    await logAudit({
      actorId: actor.id,
      action: "user.deleted",
      entity: "user",
      entityId: userId,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}


