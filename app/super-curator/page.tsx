import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getSuperCuratorDashboard } from "@/server/actions/dashboard";
import {
  getSuperCuratorMetrics,
  MOCK_CURATOR_LOADS,
  MOCK_COHORTS,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function SuperCuratorDashboardPage() {
  const data = await getSuperCuratorDashboard();

  const metrics = data?.metrics ?? getSuperCuratorMetrics();
  const curatorLoads = data?.curatorLoads ?? MOCK_CURATOR_LOADS;
  const cohorts = data?.cohorts ?? MOCK_COHORTS;

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Дашборд супер-куратора"
        description="Контроль нагрузки кураторов и мониторинг потоков."
        badge="Супер-куратор"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <Tabs
          tabs={[
            {
              label: `Нагрузка кураторов (${curatorLoads.length})`,
              content: (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {curatorLoads.map((c) => (
                    <Card key={c.curatorId} className="transition-shadow hover:shadow-sm">
                      <CardContent className="p-5 space-y-4">
                        <div>
                          <p className="font-medium">{c.curatorName}</p>
                          <p className="text-xs text-muted-foreground">{c.studentsCount} слушателей</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg bg-muted p-2">
                            <span className="text-muted-foreground">Вопросы:</span>{" "}
                            <span className={c.openQuestions > 5 ? "text-danger font-medium" : ""}>
                              {c.openQuestions}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted p-2">
                            <span className="text-muted-foreground">Проверка:</span>{" "}
                            <span className={c.pendingReviews > 10 ? "text-warning font-medium" : ""}>
                              {c.pendingReviews}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              label: `Потоки (${cohorts.length})`,
              content: (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cohorts.map((c) => (
                    <Card key={c.id} className="transition-shadow hover:shadow-sm">
                      <CardContent className="p-5 space-y-2">
                        <p className="font-medium line-clamp-1">{c.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{c.courseTitle}</p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            {c.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.studentsCount} слушателей
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
