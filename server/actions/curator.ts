"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function answerQuestionAction(questionId: string, answer: string) {
  const actor = await requireRole(["curator", "super_curator", "admin"]);
  
  if (!answer.trim()) {
    throw new Error("Ответ не может быть пустым");
  }

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      answer,
      status: "answered",
      answeredAt: new Date(),
      curatorId: actor.id
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "question.answered",
    entity: "question",
    entityId: questionId,
    metadata: { answer }
  });

  revalidatePath("/curator");
  revalidatePath("/curator/questions");
  return { success: true };
}

export async function reviewSubmissionAction(submissionId: string, input: {
  status: "ACCEPTED" | "REJECTED" | "NEEDS_REVISION";
  score: number;
  feedback?: string;
}) {
  const actor = await requireRole(["curator", "super_curator", "admin"]);

  const submission = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      status: input.status,
      score: input.score,
      feedback: input.feedback,
      reviewedAt: new Date(),
      reviewerId: actor.id
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "assignment.reviewed",
    entity: "assignment_submission",
    entityId: submissionId,
    metadata: input
  });

  revalidatePath("/curator");
  revalidatePath("/curator/submissions");
  revalidatePath("/student/assignments"); // Чтобы студент увидел обновление
  return { success: true };
}
