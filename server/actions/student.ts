"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

import { submitAssignment } from "@/server/modules/assignments/service";
import { submitQuizAttempt } from "@/server/modules/quizzes/service";

const prisma = getPrisma();

export async function getStudentQuizAttemptsAction() {
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
}

export async function getStudentAssignmentSubmissionsAction() {
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
}

export async function submitAssignmentAction(assignmentId: string, answerText?: string, fileUrl?: string) {
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
}

export async function submitQuizAction(quizId: string, answers: Record<string, unknown>) {
  const actor = await requireRole(["student"]);

  const result = await submitQuizAttempt(quizId, actor.id, answers);

  revalidatePath("/student/quizzes");
  revalidatePath(`/student/quizzes/${quizId}`);
  return { success: true, passed: result.passed, score: result.score };
}
