import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/http";
import { QuestionStatus } from "@prisma/client";

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
            where: { status: QuestionStatus.OPEN },
          })
        : 0,
      user.roles.includes("curator")
        ? prisma.assignmentSubmission.count({
            where: { status: "SUBMITTED" },
          })
        : 0,
    ]);

    const response = NextResponse.json(
      { data: { notifications, messages, openQuestions, pendingReviews } },
      { status: 200 }
    );
    response.headers.set("Cache-Control", "private, max-age=0, s-maxage=10, stale-while-revalidate=20");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
