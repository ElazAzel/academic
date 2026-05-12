import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { EnrollmentStatus } from "@prisma/client";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function listAssignments() {
  return prisma.assignment.findMany({
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      submissions: { take: 5, orderBy: { submittedAt: "desc" } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function submitAssignment(input: {
  assignmentId: string;
  userId: string;
  answerText?: string;
  fileUrl?: string;
}) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
    include: { lesson: { include: { module: { select: { courseId: true } } } } }
  });
  if (!assignment) {
    throw new ApiError("not_found", "Задание не найдено", 404);
  }

  const courseId = assignment.courseId ?? assignment.lesson?.module.courseId;
  if (!courseId) {
    throw new ApiError("bad_request", "Задание не привязано к курсу", 400);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId } }
  });
  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    throw new ApiError("forbidden", "Вы не зачислены на этот курс", 403);
  }

  const attemptNumber =
    (await prisma.assignmentSubmission.count({
      where: { assignmentId: input.assignmentId, userId: input.userId }
    })) + 1;
  if (attemptNumber > assignment.maxAttempts) {
    throw new ApiError("forbidden", "Лимит отправок задания исчерпан", 403);
  }
  const submission = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: input.assignmentId,
      userId: input.userId,
      answerText: input.answerText,
      fileUrl: input.fileUrl,
      attemptNumber,
      status: "SUBMITTED"
    }
  });
  await logAudit({
    actorId: input.userId,
    action: "assignment.submitted",
    entity: "assignment_submission",
    entityId: submission.id
  });
  return submission;
}

export async function reviewSubmission(input: {
  submissionId: string;
  reviewerId: string;
  accepted: boolean;
  score?: number;
  feedback?: string;
}) {
  const submission = await prisma.assignmentSubmission.update({
    where: { id: input.submissionId },
    data: {
      status: input.accepted ? "ACCEPTED" : "NEEDS_REVISION",
      score: input.score,
      feedback: input.feedback,
      reviewedById: input.reviewerId,
      reviewedAt: new Date()
    }
  });
  await logAudit({
    actorId: input.reviewerId,
    action: "assignment.reviewed",
    entity: "assignment_submission",
    entityId: submission.id,
    metadata: { accepted: input.accepted, score: input.score }
  });
  return submission;
}

