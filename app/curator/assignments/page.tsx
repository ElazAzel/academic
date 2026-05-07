import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { SubmissionsQueue } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { SubmissionForReview } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function CuratorAssignmentsPage() {
  const user = await requireRolePage(["curator", "super_curator"]);
  const prisma = getPrisma();

  const assignedStudents = await prisma.curatorAssignment.findMany({
    where: { curatorId: user.id },
    select: { studentId: true }
  });
  const studentIds = assignedStudents.map(a => a.studentId);

  const submissionsDb = await prisma.assignmentSubmission.findMany({
    where: { 
      userId: { in: studentIds },
      status: { in: ["SUBMITTED", "IN_REVIEW", "NEEDS_REVISION"] }
    },
    include: {
      user: true,
      assignment: { include: { course: true } }
    },
    orderBy: { submittedAt: "desc" }
  });

  const submissions: SubmissionForReview[] = submissionsDb.map(sub => ({
    id: sub.id,
    studentName: sub.user.name ?? sub.user.email,
    assignmentTitle: sub.assignment.title,
    courseTitle: sub.assignment.course?.title ?? "Без курса",
    attemptNumber: sub.attemptNumber,
    status: sub.status as any,
    submittedAt: sub.submittedAt.toISOString()
  }));

  return (
    <AppShell role="curator">
      <PageHeader title="Задания на проверку" description="Работы слушателей, ожидающие вашей оценки." badge="Куратор" />
      <div className="mt-6">
        <SubmissionsQueue submissions={submissions} />
      </div>
    </AppShell>
  );
}
