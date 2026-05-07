"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { enrollStudent as enrollStudentService } from "@/server/modules/courses/service";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { RoleKey } from "@prisma/client";

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
    console.error("Enrollment error:", error);
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
    console.error("Assign curator error:", error);
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
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
    console.error("Delete enrollment error:", error);
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
    console.error("Create user error:", error);
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}


