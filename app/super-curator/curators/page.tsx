import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { CuratorLoadTable } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorDashboard } from "@/server/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function SuperCuratorCuratorsPage() {
 await requireRolePage(["super_curator"]);

 const data = await getSuperCuratorDashboard();
 const curators = data?.curatorLoads ?? [];

 return (
  <AppShell role="super_curator">
   <PageHeader title="Кураторы" description="Нагрузка, SLA ответов, открытые вопросы и задания." />
   {curators.length > 0 ? (
    <CuratorLoadTable curators={curators} />
   ) : (
    <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
     <p className="text-sm">Нет данных о кураторах. Назначьте кураторов через раздел &laquo;Распределение&raquo;.</p>
    </div>
   )}
  </AppShell>
 );
}