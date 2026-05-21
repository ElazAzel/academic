import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { SubmissionsQueue } from "@/components/lms/dashboard-widgets";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import type { SubmissionForReview } from "@/types/domain";
import { CuratorAssignmentsFilter } from "@/components/curator/assignments-filter";

export const dynamic = "force-dynamic";

export default async function CuratorAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string; student?: string }>;
}) {
  const user = await requireRolePage(["curator", "super_curator"]);
  const prisma = getPrisma();
  const params = await searchParams;

  const assignedStudents = await prisma.curatorAssignment.findMany({
    where: { curatorId: user.id, active: true },
    select: { studentId: true },
    take: QUERY_LIMITS.dashboardStudents,
  });
  const studentIds = assignedStudents.map((a) => a.studentId);

  const statusFilter = params.status
    ? [params.status]
    : ["SUBMITTED", "IN_REVIEW", "NEEDS_REVISION"];

  const where: Record<string, unknown> = {
    userId: { in: studentIds },
    status: { in: statusFilter },
  };

  if (params.student) {
    where.userId = { in: studentIds.filter(() => true) };
    const matchingUsers = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        OR: [
          { name: { contains: params.student, mode: "insensitive" } },
          { email: { contains: params.student, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: QUERY_LIMITS.dashboardStudents,
    });
    where.userId = { in: matchingUsers.map((u) => u.id) };
  }

  const submissionsDb = await prisma.assignmentSubmission.findMany({
    where: where as never,
    include: {
      user: true,
      assignment: { include: { course: true, lesson: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: QUERY_LIMITS.dashboardQueue,
  });

  const submissions: SubmissionForReview[] = submissionsDb.map((sub) => ({
    id: sub.id,
    studentName: sub.user.name ?? sub.user.email,
    studentEmail: sub.user.email,
    assignmentTitle: sub.assignment.title,
    lessonTitle: sub.assignment.lesson?.title ?? "Без урока",
    courseTitle: sub.assignment.course?.title ?? "Без курса",
    attemptNumber: sub.attemptNumber,
    status: sub.status,
    submittedAt: sub.submittedAt.toISOString(),
  }));

  return (
    <AppShell role="curator">
      <PageHeader title="Задания на проверку" description="Работы слушателей, ожидающие вашей оценки." />

      {/* Filters — M3 */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-6">
        <CuratorAssignmentsFilter
          initialStatus={params.status}
          initialStudent={params.student}
        />

        <span className="font-body-sm text-body-sm text-m3-on-surface-variant ml-auto inline-flex items-center gap-1">
          <Icon name="assignment" className="text-[16px]" />
          {submissions.length} на проверку
        </span>
      </div>

      {/* Queue */}
      <SubmissionsQueue submissions={submissions} />
    </AppShell>
  );
}
