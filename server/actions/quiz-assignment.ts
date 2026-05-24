"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { QUIZ, ASSIGNMENT, INSTRUCTOR_ROUTES } from "@/lib/constants";
import { redirect } from "next/navigation";

const prisma = getPrisma();

export async function createQuizAction() {
  try {
    const user = await requireUser("courses:write");

    const quiz = await prisma.quiz.create({
      data: {
        title: "Новый тест",
        passThreshold: QUIZ.DEFAULT_PASS_THRESHOLD,
        maxAttempts: QUIZ.DEFAULT_MAX_ATTEMPTS,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "quiz.created",
      entity: "quiz",
      entityId: quiz.id,
    });

    redirect(INSTRUCTOR_ROUTES.quizEdit(quiz.id));
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    console.error("[createQuizAction]", error);
    throw error;
  }
}

export async function createAssignmentAction() {
  try {
    const user = await requireUser("courses:write");

    const assignment = await prisma.assignment.create({
      data: {
        title: "Новое задание",
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
    });

    redirect(INSTRUCTOR_ROUTES.assignmentEdit(assignment.id));
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    console.error("[createAssignmentAction]", error);
    throw error;
  }
}
