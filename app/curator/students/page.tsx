import { AppShell } from "@/components/layout/app-shell";
import { CuratorOperationsBoard } from "@/components/lms/curator-operations-board";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorDashboard } from "@/server/actions/dashboard";

export const metadata = {
  title: "Студенты — Куратор",
  description: "Управление закреплёнными студентами.",
};


export const dynamic = "force-dynamic";

export default async function CuratorStudentsPage() {
  await requireRolePage(["curator"]);
  const data = await getCuratorDashboard();

  return (
    <AppShell role="curator">
      <PageHeader
        title="Мои слушатели"
        description="Закрепленные слушатели с прогрессом, дедлайнами, вопросами, заданиями, рисками и быстрым чатом."
      />
      <div className="mt-6">
        {data ? <CuratorOperationsBoard students={data.students} /> : <DashboardUnavailable />}
      </div>
    </AppShell>
  );
}
