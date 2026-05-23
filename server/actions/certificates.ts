"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { revalidatePath } from "next/cache";

const prisma = getPrisma();

async function assertCanEditTemplate(courseId: string, userId: string, roles: string[]) {
  const isAdmin = roles.includes("admin");
  if (isAdmin) return;

  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });

  if (!instructor) {
    throw new ApiError("forbidden", "Вы не являетесь преподавателем этого курса", 403);
  }
}

export async function getCertificateTemplateAction(courseId: string) {
  try {
    const user = await requireUser();
    await assertCanEditTemplate(courseId, user.id, user.roles);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, durationHours: true }
    });
    if (!course) {
      throw new ApiError("not_found", "Курс не найден", 404);
    }

    const template = await prisma.certificateTemplate.findFirst({
      where: { courseId },
    });

    return {
      course,
      template: template ? {
        id: template.id,
        name: template.name,
        body: template.body,
      } : null
    };
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to retrieve template", 500);
  }
}

export async function saveCertificateTemplateAction(courseId: string, config: any) {
  try {
    const user = await requireUser();
    await assertCanEditTemplate(courseId, user.id, user.roles);

    const existing = await prisma.certificateTemplate.findFirst({
      where: { courseId }
    });

    if (existing) {
      await prisma.certificateTemplate.update({
        where: { id: existing.id },
        data: {
          body: config || {},
        }
      });
    } else {
      await prisma.certificateTemplate.create({
        data: {
          courseId,
          name: "Custom Template",
          body: config || {},
          isDefault: false,
        }
      });
    }

    revalidatePath(`/admin/certificates/designer/${courseId}`);
    revalidatePath(`/instructor/courses/${courseId}/certificate`);
    return { success: true };
  } catch (err) {
    throw err instanceof Error ? err : new ApiError("internal_error", "Failed to save template", 500);
  }
}
