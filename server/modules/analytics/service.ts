import { UserAccountStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function getAdminOverview() {
  const [
    activeUsers,
    courses,
    enrollments,
    completions,
    quizAttempts,
    certificates,
  ] = await Promise.all([
    prisma.user.count({ where: { status: UserAccountStatus.ACTIVE } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.courseProgress.count({ where: { status: "COMPLETED" } }),
    prisma.quizAttempt.findMany({ select: { score: true, passed: true } }),
    prisma.certificate.count(),
  ]);

  const completionRate = enrollments === 0 ? 0 : Math.round((completions / enrollments) * 100);
  const averageQuizScore =
    quizAttempts.length === 0
      ? 0
      : Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length);

  return {
    activeUsers,
    courses,
    enrollments,
    completionRate,
    averageQuizScore,
    passedQuizAttempts: quizAttempts.filter((attempt) => attempt.passed).length,
    revenueCents: 0,
    currency: "rub",
    certificates,
  };
}
