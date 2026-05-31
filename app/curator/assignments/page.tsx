import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { SubmissionsQueue } from "@/components/lms/dashboard-widgets";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorAssignmentsPageData } from "@/server/modules/page-data/service";
import { CuratorAssignmentsFilter } from "@/components/curator/assignments-filter";

export const metadata = {
  title: "Задания — Куратор",
  description: "Проверка и оценка заданий.",
};


export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 20;

export default async function CuratorAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; status?: string; student?: string; page?: string }>;
}) {
  const user = await requireRolePage(["curator", "super_curator"]);
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));

  const { submissions, total, totalPages } = await getCuratorAssignmentsPageData({
    curatorId: user.id,
    status: params.status,
    student: params.student,
    page: currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  // Build baseUrl preserving filters but without page param
  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.student) filterParams.set("student", params.student);
  const filterString = filterParams.toString();
  const baseUrl = `/curator/assignments${filterString ? `?${filterString}` : ""}`;

  return (
    <AppShell role="curator">
      <PageHeader title="Задания на проверку" description="Работы слушателей, ожидающие вашей оценки." />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-6">
        <CuratorAssignmentsFilter
          initialStatus={params.status}
          initialStudent={params.student}
        />

        <span className="font-body-sm text-body-sm text-m3-on-surface-variant ml-auto inline-flex items-center gap-1">
          <Icon name="assignment" className="text-[16px]" />
          {total} на проверку
        </span>
      </div>

      {/* Queue */}
      <SubmissionsQueue submissions={submissions} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={currentPage} totalPages={totalPages} baseUrl={baseUrl} />
        </div>
      )}
    </AppShell>
  );
}
