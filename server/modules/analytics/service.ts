import { ProgressStatus, UserAccountStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export async function getAdminOverview() {
  const [
    activeUsers,
    courses,
    enrollments,
    completions,
    quizScore,
    quizPassed,
    certificates,
  ] = await Promise.all([
    prisma.user.count({ where: { status: UserAccountStatus.ACTIVE } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.quizAttempt.aggregate({ _avg: { score: true } }),
    prisma.quizAttempt.count({ where: { passed: true } }),
    prisma.certificate.count(),
  ]);

  const completionRate = enrollments === 0 ? 0 : Math.round((completions / enrollments) * 100);
  const averageQuizScore = Math.round(quizScore._avg.score ?? 0);

  return {
    activeUsers,
    courses,
    enrollments,
    completionRate,
    averageQuizScore,
    passedQuizAttempts: quizPassed,
    revenueCents: 0,
    currency: "rub",
    certificates,
  };
}
