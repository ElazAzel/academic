"use server";

import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { redirect } from "next/navigation";

const prisma = getPrisma();

export async function createQuizAction() {
  const user = await requireUser("courses:write");

  const quiz = await prisma.quiz.create({
    data: {
      title: "Новый тест",
      passThreshold: 80,
      maxAttempts: 3,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "quiz.created",
    entity: "quiz",
    entityId: quiz.id,
  });

  redirect(`/instructor/quizzes/${quiz.id}/edit`);
}

export async function createAssignmentAction() {
  const user = await requireUser("courses:write");

  const assignment = await prisma.assignment.create({
    data: {
      title: "Новое задание",
      instructions: "",
      maxScore: 100,
      maxAttempts: 3,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "assignment.created",
    entity: "assignment",
    entityId: assignment.id,
  });

  redirect(`/instructor/assignments/${assignment.id}/edit`);
}
