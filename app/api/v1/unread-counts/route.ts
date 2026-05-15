import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ok, errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();

    const prisma = getPrisma();
    const isCurator = user.roles.some((r) => ["curator", "super_curator", "admin"].includes(r));

    const [notifications, messages, openQuestions, pendingReviews] = await Promise.all([
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
      isCurator
        ? prisma.message.count({
            where: { receiverId: user.id, readAt: null },
          })
        : 0,
      isCurator
        ? prisma.lessonQuestion.count({
            where: { status: "OPEN" },
          })
        : 0,
      user.roles.includes("curator")
        ? prisma.assignmentSubmission.count({
            where: { status: "SUBMITTED" },
          })
        : 0,
    ]);

    return ok({
      notifications,
      messages,
      openQuestions,
      pendingReviews,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
