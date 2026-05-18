import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { SubmissionsQueue } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import type { SubmissionForReview } from "@/types/domain";

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

  // Фильтры

  const statusFilter = params.status
    ? [params.status]
    : ["SUBMITTED", "IN_REVIEW", "NEEDS_REVISION"];

  const where: Record<string, unknown> = {
    userId: { in: studentIds },
    status: { in: statusFilter },
  };

  // Фильтр по студенту
  if (params.student) {
    where.userId = { in: studentIds.filter(() => true) };
    // Поиск по имени через отдельный запрос
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-6">
        <form className="flex flex-wrap items-center gap-3">
          <select
            name="status"
            defaultValue={params.status ?? ""}
            onChange={(e) => {
              const url = new URL(window.location.href);
              if (e.target.value) url.searchParams.set("status", e.target.value);
              else url.searchParams.delete("status");
              window.location.href = url.toString();
            }}
            className="h-9 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Все статусы</option>
            <option value="SUBMITTED">Отправлено</option>
            <option value="IN_REVIEW">На проверке</option>
            <option value="NEEDS_REVISION">На доработку</option>
          </select>

          <input
            name="student"
            defaultValue={params.student ?? ""}
            placeholder="Поиск по слушателю..."
            className="h-9 rounded-xl border bg-background px-3 text-sm outline-none w-48 focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const url = new URL(window.location.href);
                if (e.currentTarget.value) url.searchParams.set("student", e.currentTarget.value);
                else url.searchParams.delete("student");
                window.location.href = url.toString();
              }
            }}
          />

          {(params.status || params.student) && (
            <a
              href="/curator/assignments"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Сбросить фильтры
            </a>
          )}
        </form>

        <span className="text-xs text-muted-foreground ml-auto">
          {submissions.length} на проверку
        </span>
      </div>

      {/* Queue */}
      <SubmissionsQueue submissions={submissions} />
    </AppShell>
  );
}
