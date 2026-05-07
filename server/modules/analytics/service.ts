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
    activeInviteLinks,
<<<<<<< HEAD
    inviteActivations
=======
    inviteActivationStats
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
  ] = await Promise.all([
    prisma.user.count({ where: { status: "active" } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.courseProgress.count({ where: { status: "COMPLETED" } }),
    prisma.quizAttempt.findMany({ select: { score: true, passed: true } }),
    prisma.certificate.count(),
    prisma.inviteLink.count({ where: { status: "active" } }),
    prisma.inviteLink.aggregate({ _sum: { activationCount: true } })
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
    activeInviteLinks,
<<<<<<< HEAD
    inviteActivations: inviteActivations._sum.activationCount ?? 0
=======
    inviteActivations: inviteActivationStats._sum.activationCount ?? 0
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2
  };
}
