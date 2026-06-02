"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { QUIZ, ASSIGNMENT, INSTRUCTOR_ROUTES } from "@/lib/constants";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/http";
import { z } from "zod";

const prisma = getPrisma();

const createLinkedContentSchema = z.object({
  courseId: z.string().min(1).optional(),
});

function parseLinkedContentInput(formData?: FormData) {
  const rawCourseId = formData?.get("courseId");
  return createLinkedContentSchema.parse({
    courseId: typeof rawCourseId === "string" && rawCourseId.trim() !== "" ? rawCourseId : undefined,
  });
}

function hasAdminRole(roles: string[]) {
  return roles.includes("admin");
}

function throwQuizAssignmentActionError(error: unknown, label: string): never {
  if (error instanceof Error && "digest" in error) throw error;
  if (error instanceof ApiError) throw error;
  console.error(label, error);
  throw new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
}

async function assertWritableCourse(user: { id: string; roles: string[] }, courseId: string) {
  if (hasAdminRole(user.roles)) return;

  const instructorCourse = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId: user.id } },
    select: { courseId: true },
  });

  if (!instructorCourse) {
    throw new ApiError("forbidden", "Курс недоступен для редактирования", 403);
  }
}

async function resolveWritableCourseId(user: { id: string; roles: string[] }, requestedCourseId?: string) {
  if (requestedCourseId) {
    await assertWritableCourse(user, requestedCourseId);
    return requestedCourseId;
  }

  const course = await prisma.course.findFirst({
    where: hasAdminRole(user.roles) ? {} : { instructors: { some: { userId: user.id } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!course) {
    throw new ApiError("not_found", "Сначала создайте курс для тестов и заданий", 404);
  }

  return course.id;
}

export async function createQuizAction(formData?: FormData) {
  try {
    const user = await requireUser("courses:write");
    const input = parseLinkedContentInput(formData);
    const courseId = await resolveWritableCourseId(user, input.courseId);

    const quiz = await prisma.quiz.create({
      data: {
        title: "Новый тест",
        courseId,
        passThreshold: QUIZ.DEFAULT_PASS_THRESHOLD,
        maxAttempts: QUIZ.DEFAULT_MAX_ATTEMPTS,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "quiz.created",
      entity: "quiz",
      entityId: quiz.id,
      metadata: { courseId },
    });

    redirect(INSTRUCTOR_ROUTES.quizEdit(quiz.id));
  } catch (error) {
    throwQuizAssignmentActionError(error, "[createQuizAction]");
  }
}

export async function createAssignmentAction(formData?: FormData) {
  try {
    const user = await requireUser("courses:write");
    const input = parseLinkedContentInput(formData);
    const courseId = await resolveWritableCourseId(user, input.courseId);

    const assignment = await prisma.assignment.create({
      data: {
        title: "Новое задание",
        courseId,
        instructions: "",
        maxScore: ASSIGNMENT.DEFAULT_MAX_SCORE,
        maxAttempts: ASSIGNMENT.DEFAULT_MAX_ATTEMPTS,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "assignment.created",
      entity: "assignment",
      entityId: assignment.id,
      metadata: { courseId },
    });

    redirect(INSTRUCTOR_ROUTES.assignmentEdit(assignment.id));
  } catch (error) {
    throwQuizAssignmentActionError(error, "[createAssignmentAction]");
  }
}
