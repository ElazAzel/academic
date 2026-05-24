"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

import { submitAssignment } from "@/server/modules/assignments/service";
import { submitQuizAttempt } from "@/server/modules/quizzes/service";

const prisma = getPrisma();

export async function getStudentQuizAttemptsAction() {
  try {
    const user = await requireRole(["student"]);
    return prisma.quizAttempt.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        quizId: true,
        score: true,
        passed: true,
        startedAt: true,
        submittedAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            passThreshold: true,
            course: { select: { id: true, title: true } },
            lesson: { select: { id: true, title: true } },
          }
        }
      },
      orderBy: { startedAt: "desc" },
    });
  } catch (error) {
    console.error("[getStudentQuizAttemptsAction]", error);
    throw error;
  }
}

export async function getStudentAssignmentSubmissionsAction() {
  try {
    const user = await requireRole(["student"]);
    return prisma.assignmentSubmission.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        assignmentId: true,
        status: true,
        score: true,
        answerText: true,
        fileUrl: true,
        submittedAt: true,
        reviewedAt: true,
        feedback: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            course: { select: { id: true, title: true } },
            lesson: { select: { id: true, title: true } },
          }
        }
      },
      orderBy: { submittedAt: "desc" },
    });
  } catch (error) {
    console.error("[getStudentAssignmentSubmissionsAction]", error);
    throw error;
  }
}

const SubmitAssignmentActionSchema = z.object({
  assignmentId: z.string().min(1, "ID задания обязателен"),
  answerText: z.string().optional(),
  fileUrl: z.string().optional(),
});

export async function submitAssignmentAction(assignmentId: string, answerText?: string, fileUrl?: string) {
  try {
    const parsed = SubmitAssignmentActionSchema.safeParse({ assignmentId, answerText, fileUrl });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

    const actor = await requireRole(["student"]);

    await submitAssignment({
      assignmentId,
      userId: actor.id,
      answerText,
      fileUrl
    });

    revalidatePath("/student/assignments");
    revalidatePath(`/student/assignments/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error("[submitAssignmentAction]", error);
    return { success: false, error: "Произошла ошибка при отправке задания" };
  }
}

const SubmitQuizActionSchema = z.object({
  quizId: z.string().min(1, "ID теста обязателен"),
  answers: z.record(z.unknown()),
});

export async function submitQuizAction(quizId: string, answers: Record<string, unknown>) {
  try {
    const parsed = SubmitQuizActionSchema.safeParse({ quizId, answers });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

    const actor = await requireRole(["student"]);

    const result = await submitQuizAttempt(quizId, actor.id, answers);

    revalidatePath("/student/quizzes");
    revalidatePath(`/student/quizzes/${quizId}`);
    return { success: true, passed: result.passed, score: result.score };
  } catch (error) {
    console.error("[submitQuizAction]", error);
    return { success: false, error: "Произошла ошибка при отправке теста" };
  }
}
