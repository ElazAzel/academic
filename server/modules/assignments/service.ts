import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { Prisma, EnrollmentStatus } from "@prisma/client";
import { logAudit } from "@/server/modules/audit/service";
import { createNotification } from "@/server/modules/notifications/service";

const prisma = getPrisma();

export async function listAssignments(userId: string, roleKeys: string[]) {
  const isAdmin = roleKeys.includes("admin");
  const isInstructor = roleKeys.includes("instructor");

  const where: Record<string, unknown> = {};

  if (!isAdmin) {
    if (isInstructor) {
      where.course = {
        instructors: { some: { userId } }
      };
    } else {
      where.course = {
        enrollments: { some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } } }
      };
    }
  }

  return prisma.assignment.findMany({
    where,
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      ...(isAdmin || isInstructor
        ? { submissions: { take: 5, orderBy: { submittedAt: "desc" } } }
        : { submissions: { where: { userId }, take: 5, orderBy: { submittedAt: "desc" } } })
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

  const submission = await prisma.$transaction(async (tx) => {
    // FOR UPDATE на enrollment — mutex per-user-per-course против race condition
    await tx.$queryRaw(
      Prisma.sql`SELECT 1 FROM "enrollment" WHERE "user_id" = ${input.userId} AND "course_id" = ${courseId} FOR UPDATE`
    );
    const attemptNumber =
      (await tx.assignmentSubmission.count({
        where: { assignmentId: input.assignmentId, userId: input.userId }
      })) + 1;
    if (attemptNumber > assignment.maxAttempts) {
      throw new ApiError("forbidden", "Лимит отправок задания исчерпан", 403);
    }
    return tx.assignmentSubmission.create({
      data: {
        assignmentId: input.assignmentId,
        userId: input.userId,
        answerText: input.answerText,
        fileUrl: input.fileUrl,
        attemptNumber,
        status: "SUBMITTED"
      }
    });
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
  // Load submission with full context for scope check
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    include: {
      assignment: {
        include: {
          lesson: { include: { module: { select: { courseId: true } } } }
        }
      }
    }
  });
  if (!submission) {
    throw new ApiError("not_found", "Решение не найдено", 404);
  }

  const courseId = submission.assignment.courseId ?? submission.assignment.lesson?.module.courseId;
  const studentId = submission.userId;

  // Scope check: reviewer must be admin, course instructor, or assigned curator of the student
  const reviewer = await prisma.user.findUnique({
    where: { id: input.reviewerId },
    include: { roles: { include: { role: true } } }
  });
  if (!reviewer) {
    throw new ApiError("forbidden", "Недостаточно прав", 403);
  }
  const roleKeys = reviewer.roles.map((r) => r.role.key);
  const isAdmin = roleKeys.includes("admin");

  let isAuthorized = isAdmin;
  if (!isAuthorized && courseId) {
    const isInstructor = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: input.reviewerId } }
    });
    if (isInstructor) isAuthorized = true;
  }
  if (!isAuthorized) {
    const curatorAssignment = await prisma.curatorAssignment.findFirst({
      where: { studentId, curatorId: input.reviewerId, active: true }
    });
    if (curatorAssignment) isAuthorized = true;
  }
  if (!isAuthorized) {
    throw new ApiError("forbidden", "Вы не можете проверять это задание", 403);
  }

  const updated = await prisma.assignmentSubmission.update({
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
    entityId: updated.id,
    metadata: { accepted: input.accepted, score: input.score }
  });
  await createNotification({
    userId: updated.userId,
    event: "assignment_reviewed",
    refType: "assignment_submission",
    refId: updated.id,
    data: {
      assignmentId: updated.assignmentId,
      status: updated.status,
      score: updated.score,
      link: `/student/assignments/${updated.assignmentId}`
    }
  });
  return updated;
}

