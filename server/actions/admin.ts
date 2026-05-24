"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { enrollStudent as enrollStudentService } from "@/server/modules/courses/service";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { RoleKey, UserAccountStatus } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { enrollStudentSchema, assignCuratorSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import {
  getSuperCuratorScope,
  isCohortInSuperCuratorScope,
  isCuratorInSuperCuratorScope,
} from "@/server/modules/super-curator/scope";
import { createNotification } from "@/server/modules/notifications/service";

const prisma = getPrisma();

async function notifyCuratorAssignment(input: { studentId: string; curatorId: string; cohortId: string }) {
  await Promise.all([
    createNotification({
      userId: input.studentId,
      event: "curator_assigned",
      refType: "curator_assignment",
      refId: `${input.cohortId}-${input.studentId}`,
      data: {
        curatorId: input.curatorId,
        cohortId: input.cohortId,
        link: "/student",
      },
    }),
    createNotification({
      userId: input.curatorId,
      event: "student_assigned",
      refType: "curator_assignment",
      refId: `${input.cohortId}-${input.studentId}`,
      data: {
        studentId: input.studentId,
        cohortId: input.cohortId,
        link: `/curator/students`,
      },
    }),
  ]);
}

export async function enrollStudentAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);

    const parsed = enrollStudentSchema.safeParse({
      userId: formData.get("userId"),
      courseId: formData.get("courseId"),
      cohortId: formData.get("cohortId") || undefined,
      curatorId: formData.get("curatorId") || undefined,
    });
    if (!parsed.success) {
      throw new ApiError("bad_request", parsed.error.errors[0]?.message ?? "Некорректные данные формы", 400);
    }
    const { userId, courseId, cohortId, curatorId } = parsed.data;

    if (curatorId && !cohortId) {
      throw new ApiError("bad_request", "Для назначения куратора необходимо выбрать поток (когорту)", 400);
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
      await logAudit({
        actorId: actor.id,
        action: "curator.assigned",
        entity: "curator_assignment",
        entityId: `${cohortId}-${userId}`,
        metadata: { studentId: userId, curatorId, cohortId },
      });
      await notifyCuratorAssignment({ studentId: userId, curatorId, cohortId });
    }

    revalidatePath("/admin/enrollments");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

export async function assignCuratorAction(input: { studentId: string; curatorId: string; cohortId: string }) {
  try {
    const actor = await requireRole(["admin"]);
    const parsed = assignCuratorSchema.safeParse(input);
    if (!parsed.success) {
      throw new ApiError("bad_request", parsed.error.errors[0]?.message ?? "Некорректные данные", 400);
    }

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
    await notifyCuratorAssignment(input);

    revalidatePath("/admin/enrollments");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new Error("Внутренняя ошибка сервера");
  }
}

const PauseEnrollmentActionSchema = z.object({
  enrollmentId: z.string().min(1, "ID записи обязателен"),
});

export async function pauseEnrollmentAction(enrollmentId: string) {
  try {
    const parsed = PauseEnrollmentActionSchema.safeParse({ enrollmentId });
    if (!parsed.success) {
      throw new ApiError("bad_request", parsed.error.errors[0]?.message ?? "Некорректные данные", 400);
    }

    const actor = await requireRole(["admin"]);
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new ApiError("not_found", "Запись не найдена", 404);
    if (enrollment.status !== "ACTIVE") throw new ApiError("bad_request", "Можно приостановить только активное зачисление", 400);

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
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

const ResumeEnrollmentActionSchema = z.object({
  enrollmentId: z.string().min(1, "ID записи обязателен"),
});

export async function resumeEnrollmentAction(enrollmentId: string) {
  try {
    const parsed = ResumeEnrollmentActionSchema.safeParse({ enrollmentId });
    if (!parsed.success) {
      throw new ApiError("bad_request", parsed.error.errors[0]?.message ?? "Некорректные данные", 400);
    }

    const actor = await requireRole(["admin"]);
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new ApiError("not_found", "Запись не найдена", 404);
    if (enrollment.status !== "PAUSED") throw new ApiError("bad_request", "Можно возобновить только приостановленное зачисление", 400);

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
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
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
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

export async function assignCuratorFromSupervisorAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);

    const studentId = formData.get("studentId") as string;
    const curatorId = formData.get("curatorId") as string;
    const cohortId = formData.get("cohortId") as string;

    if (!studentId || !curatorId || !cohortId) {
      throw new ApiError("bad_request", "Студент, куратор и поток обязательны", 400);
    }

    const [targetCurator, enrollment, currentAssignment] = await Promise.all([
      prisma.user.findFirst({
        where: { id: curatorId, roles: { some: { role: { key: "curator" } } } },
        select: { id: true },
      }),
      prisma.enrollment.findFirst({
        where: { userId: studentId, cohortId },
        select: { id: true },
      }),
      prisma.curatorAssignment.findUnique({
        where: { cohortId_studentId: { cohortId, studentId } },
        select: { active: true, superCuratorId: true },
      }),
    ]);

    if (!targetCurator) {
      throw new ApiError("not_found", "Выбранный пользователь не является куратором", 404);
    }
    if (!enrollment) {
      throw new ApiError("not_found", "Слушатель не зачислен в выбранный поток", 404);
    }

    if (actor.roles.includes("super_curator") && !actor.roles.includes("admin")) {
      const scope = await getSuperCuratorScope(actor);
      if (!isCohortInSuperCuratorScope(scope, cohortId)) {
        throw new ApiError("forbidden", "Поток вне зоны ответственности супер-куратора", 403);
      }
      if (!isCuratorInSuperCuratorScope(scope, curatorId)) {
        throw new ApiError("forbidden", "Куратор вне зоны ответственности супер-куратора", 403);
      }
      if (currentAssignment?.active && currentAssignment.superCuratorId !== actor.id) {
        throw new ApiError("forbidden", "Слушатель закреплен за другой зоной ответственности", 403);
      }
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
    await notifyCuratorAssignment({ studentId, curatorId, cohortId });

    revalidatePath("/super-curator/distribution");
    revalidatePath("/super-curator");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
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
      throw new ApiError("bad_request", "Название и курс обязательны", 400);
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
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
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
      throw new ApiError("bad_request", "ID и название обязательны", 400);
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
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
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
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin", "super_curator"]);
    
    const email = formData.get("email") as string;
    const name = formData.get("name") as string || undefined;
    const roleKeys = formData.getAll("roles") as RoleKey[];

    if (!email) {
      throw new ApiError("bad_request", "Email обязателен", 400);
    }

    const { createUser } = await import("@/server/modules/users/service");
    await createUser(actor, { email, name, roleKeys });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    const actor = await requireRole(["admin"]);
    const userId = formData.get("id") as string;
    const name = formData.get("name") as string;
    const realName = formData.get("realName") as string;
    const status = formData.get("status") as string;

    if (!userId) throw new ApiError("bad_request", "ID пользователя обязателен", 400);

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name ? { name } : {}),
        ...(realName ? { organization: realName } : {}),
        ...(status ? { status: status as UserAccountStatus } : {}),
      },
    });

    await logAudit({
      actorId: actor.id,
      action: "user.updated",
      entity: "user",
      entityId: userId,
      metadata: { name, realName, status },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const actor = await requireRole(["admin"]);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError("not_found", "Пользователь не найден", 404);

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
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}

function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pass = "";
  for (let i = 0; i < length; i++) {
    const r = Math.floor(Math.random() * chars.length);
    pass += chars[r];
  }
  return pass;
}

export async function importUsersAction(
  usersList: Array<{ email: string; name?: string; roleKeys: RoleKey[] }>,
  cohortId?: string
) {
  try {
    const actor = await requireRole(["admin", "super_curator"]);
    
    // Fetch all roles from DB to get their IDs
    const dbRoles = await prisma.role.findMany();
    const rolesMap = dbRoles.reduce((acc, r) => {
      acc[r.key as RoleKey] = r.id;
      return acc;
    }, {} as Record<RoleKey, string>);

    const results = [];

    for (const item of usersList) {
      const email = item.email.toLowerCase().trim();
      const name = item.name?.trim() || null;
      const roleKeys = item.roleKeys;

      if (!email) {
        results.push({ email: "N/A", name: name || "", status: "failed" as const, error: "Email отсутствует" });
        continue;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email, name: name || "", status: "failed" as const, error: "Некорректный формат email" });
        continue;
      }

      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } }
        });

        if (existingUser) {
          let enrolled = false;
          
          // If student role and cohort is provided, enroll them
          if (cohortId && (roleKeys.includes(RoleKey.student) || existingUser.roles.some(r => r.role.key === RoleKey.student))) {
            const course = await prisma.cohort.findUnique({
              where: { id: cohortId },
              select: { courseId: true }
            });

            if (course) {
              const existingEnrollment = await prisma.enrollment.findFirst({
                where: { userId: existingUser.id, cohortId }
              });

              if (!existingEnrollment) {
                await prisma.enrollment.create({
                  data: {
                    userId: existingUser.id,
                    courseId: course.courseId || "",
                    cohortId,
                    status: "ACTIVE"
                  }
                });

                await logAudit({
                  actorId: actor.id,
                  action: "enrollment.created",
                  entity: "enrollment",
                  entityId: existingUser.id,
                  metadata: { cohortId, courseId: course.courseId, source: "bulk_import" }
                });

                enrolled = true;
              }
            }
          }

          results.push({
            email,
            name: existingUser.name || name || "",
            status: enrolled ? ("enrolled" as const) : ("skipped" as const),
            error: enrolled ? undefined : "Пользователь уже существует"
          });
        } else {
          // Create new user
          const tempPassword = generateTempPassword();
          const passwordHash = await hashPassword(tempPassword);

          const newUser = await prisma.user.create({
            data: {
              email,
              name,
              passwordHash,
              emailVerified: new Date(),
              status: UserAccountStatus.ACTIVE,
              roles: {
                create: roleKeys.map(role => ({ roleId: rolesMap[role] }))
              }
            }
          });

          await logAudit({
            actorId: actor.id,
            action: "user.created",
            entity: "user",
            entityId: newUser.id,
            metadata: { email, roles: roleKeys, source: "bulk_import" }
          });

          // Enroll if cohort provided and roles include student
          if (cohortId && roleKeys.includes(RoleKey.student)) {
            const course = await prisma.cohort.findUnique({
              where: { id: cohortId },
              select: { courseId: true }
            });

            if (course) {
              await prisma.enrollment.create({
                data: {
                  userId: newUser.id,
                  courseId: course.courseId || "",
                  cohortId,
                  status: "ACTIVE"
                }
              });

              await logAudit({
                actorId: actor.id,
                action: "enrollment.created",
                entity: "enrollment",
                entityId: newUser.id,
                metadata: { cohortId, courseId: course.courseId, source: "bulk_import" }
              });

            }
          }

          results.push({
            email,
            name: name || "",
            status: "created" as const,
            tempPassword
          });
        }
      } catch (err) {
        results.push({
          email,
          name: name || "",
          status: "failed" as const,
          error: err instanceof Error ? err.message : "Неизвестная ошибка при создании"
        });
      }
    }

    revalidatePath("/admin/users");
    return { success: true, results };
  } catch (error) {
    throw error instanceof Error ? error : new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
  }
}


