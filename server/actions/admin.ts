"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import { enrollStudent as enrollStudentService } from "@/server/modules/courses/service";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function enrollStudentAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  
  const userId = formData.get("userId") as string;
  const courseId = formData.get("courseId") as string;
  const cohortId = formData.get("cohortId") as string || undefined;
  const curatorId = formData.get("curatorId") as string || undefined;

  if (!userId || !courseId) {
    throw new Error("Не указан студент или курс");
  }

  const enrollment = await enrollStudentService({ userId, courseId, cohortId }, actor.id);

  if (curatorId) {
    await prisma.curatorAssignment.upsert({
      where: { 
        cohortId_studentId: { 
          cohortId: cohortId || "default-cohort", // Если когорты нет, используем заглушку или логику без когорты
          studentId: userId 
        } 
      },
      update: { curatorId, active: true },
      create: {
        curatorId,
        studentId: userId,
        cohortId: cohortId || "default-cohort",
        active: true
      }
    });
  }

  revalidatePath("/admin/enrollments");
  return { success: true };
}

export async function assignCuratorAction(input: { studentId: string; curatorId: string; cohortId: string }) {
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
}
