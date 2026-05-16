"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { createNotification } from "@/server/modules/notifications/service";
import { markLessonProgress } from "@/server/modules/progress/service";
import { ApiError } from "@/lib/http";
import { NOTIFICATION_CHANNELS } from "@/lib/constants";

const prisma = getPrisma();

async function assertCuratorStudentAccess(actor: { id: string; roles: string[] }, studentId: string) {
  if (actor.roles.includes("admin")) return;
  const assignment = await prisma.curatorAssignment.findFirst({
    where: {
      studentId,
      active: true,
      ...(actor.roles.includes("super_curator")
        ? { superCuratorId: actor.id }
        : { curatorId: actor.id }),
    },
  });
  if (!assignment) {
    throw new ApiError("forbidden", "Доступ запрещен: студент не закреплен за вами", 403);
  }
}

export async function answerQuestionAction(questionId: string, answer: string) {
  const actor = await requireRole(["curator", "super_curator", "admin"]);
  
  if (!answer.trim()) {
    throw new ApiError("bad_request", "Ответ не может быть пустым", 400);
  }

  const question = await prisma.lessonQuestion.findUnique({
    where: { id: questionId },
    select: { studentId: true, lessonId: true }
  });
  if (!question) {
    throw new ApiError("not_found", "Вопрос не найден", 404);
  }

  await assertCuratorStudentAccess(actor, question.studentId);

  await prisma.lessonQuestion.update({
    where: { id: questionId },
    data: {
      answer,
      status: "ANSWERED",
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

  if (question?.studentId) {
    await createNotification({
      userId: question.studentId,
      event: "question_answered",
      channel: NOTIFICATION_CHANNELS.IN_APP,
    });
  }

  if (question?.lessonId) {
    revalidatePath("/student/lessons/" + question.lessonId);
  }
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

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    select: { userId: true, assignment: { select: { lessonId: true } } }
  });
  if (!submission) {
    throw new ApiError("not_found", "Запись не найдена", 404);
  }

  await assertCuratorStudentAccess(actor, submission.userId);

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      status: input.status,
      score: input.score,
      feedback: input.feedback,
      reviewedAt: new Date(),
      reviewedById: actor.id
    },
    include: { assignment: true }
  });

  await logAudit({
    actorId: actor.id,
    action: "assignment.reviewed",
    entity: "assignment_submission",
    entityId: submissionId,
    metadata: input
  });

  await createNotification({
    userId: updated.userId,
    event: "assignment_reviewed",
    channel: NOTIFICATION_CHANNELS.IN_APP,
    data: { status: input.status, score: input.score }
  });

  if (input.status === "ACCEPTED" && updated.assignment.lessonId) {
    try {
      await markLessonProgress(updated.userId, updated.assignment.lessonId, 100);
    } catch (e) {
      console.error("Failed to update student progress after assignment acceptance:", e);
    }
  }

  revalidatePath("/curator");
  revalidatePath("/curator/submissions");
  revalidatePath("/student/assignments");
  return { success: true };
}

export async function forwardQuestionAction(questionId: string) {
  const actor = await requireRole(["curator", "super_curator", "admin"]);

  const question = await prisma.lessonQuestion.findUnique({
    where: { id: questionId },
    include: { student: { select: { name: true } } }
  });

  if (!question) {
    throw new ApiError("not_found", "Вопрос не найден", 404);
  }

  await assertCuratorStudentAccess(actor, question.studentId);

  await prisma.lessonQuestion.update({
    where: { id: questionId },
    data: {
      status: "FORWARDED"
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "question.forwarded",
    entity: "question",
    entityId: questionId
  });

  if (question?.lessonId) {
    revalidatePath("/student/lessons/" + question.lessonId);
  }
  revalidatePath("/curator");
  revalidatePath("/curator/questions");
  // Notify student and original curator
  if (question?.studentId) {
    await createNotification({
      userId: question.studentId,
      event: "question_forwarded",
      data: { lessonId: question.lessonId }
    }).catch((e) => console.error("Failed to notify student:", e));
  }
  if (question?.curatorId) {
    await createNotification({
      userId: question.curatorId,
      event: "question_forwarded",
      data: { lessonId: question.lessonId, studentName: question.student?.name }
    }).catch((e) => console.error("Failed to notify curator:", e));
  }

  revalidatePath("/instructor");
  return { success: true };
}

export async function answerForwardedQuestionAction(formData: FormData) {
  const questionId = formData.get("questionId") as string;
  const answer = formData.get("answer") as string;
  const actor = await requireRole(["instructor", "admin"]);

  if (!answer?.trim()) {
    throw new ApiError("bad_request", "Ответ не может быть пустым", 400);
  }

  const question = await prisma.lessonQuestion.findUnique({
    where: { id: questionId },
    include: {
      student: { select: { name: true, email: true } },
      lesson: { include: { module: { include: { course: { include: { instructors: { select: { userId: true } } } } } } } }
    }
  });
  if (!question || question.status !== "FORWARDED") {
    throw new ApiError("not_found", "Вопрос не найден или не был переадресован", 404);
  }

  if (!actor.roles.includes("admin")) {
    const isInstructor = question.lesson.module.course.instructors.some(
      (i) => i.userId === actor.id
    );
    if (!isInstructor) {
      throw new ApiError("forbidden", "Доступ запрещен: вопрос относится к курсу, который вы не ведете", 403);
    }
  }

  await prisma.lessonQuestion.update({
    where: { id: questionId },
    data: {
      answer,
      status: "ANSWERED",
      answeredAt: new Date()
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "question.answered_forwarded",
    entity: "question",
    entityId: questionId,
    metadata: { answer }
  });

  // Notify student and original curator
  if (question?.studentId) {
    await createNotification({
      userId: question.studentId,
      event: "question_answered",
      data: { lessonId: question.lessonId }
    }).catch((e) => console.error("Failed to notify student:", e));
  }
  if (question?.curatorId) {
    await createNotification({
      userId: question.curatorId,
      event: "question_answered",
      data: { lessonId: question.lessonId, studentName: question.student?.name }
    }).catch((e) => console.error("Failed to notify curator:", e));
  }

  revalidatePath("/instructor");
  revalidatePath("/instructor/questions");
  revalidatePath("/curator");
}

