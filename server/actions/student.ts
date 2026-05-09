"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";

import { submitAssignment } from "@/server/modules/assignments/service";
import { submitQuizAttempt } from "@/server/modules/quizzes/service";



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
