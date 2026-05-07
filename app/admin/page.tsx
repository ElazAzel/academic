import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import {
  getAdminMetrics,
  MOCK_COURSES,
  MOCK_COHORTS,
  MOCK_CERTIFICATES,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRolePage(["admin"]);
  const data = await getAdminDashboard();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="admin">
        <PageHeader
          title="Дашборд администратора"
          description="Обзор всех систем, потоков и выданных сертификатов."
          badge="Администратор"
        />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? [];
  const courses = data?.courses ?? [];
  const cohorts = data?.cohorts ?? [];
  const certificates = data?.certificates ?? [];

  return (
    <AppShell role="admin">
      <PageHeader
        title="Дашборд администратора"
        description="Обзор всех систем, потоков и выданных сертификатов."
        badge="Администратор"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <Tabs
          tabs={[
            {
              label: `Курсы (${courses.length})`,
              content: (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="p-5">
                        <p className="font-medium line-clamp-1">{c.title}</p>
                        <p className="text-xs text-muted-foreground pt-1">{c.modulesCount} модулей</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                            {c.status}
                          </span>
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
                    <Card key={c.id}>
                      <CardContent className="p-5">
                        <p className="font-medium line-clamp-1">{c.name}</p>
                        <p className="text-xs text-muted-foreground pt-1">{c.studentsCount} слушателей</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            {c.status}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              label: `Сертификаты (${certificates.length})`,
              content: (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {certificates.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="p-5">
                        <p className="font-medium text-sm">{c.number}</p>
                        <p className="text-sm pt-1">{c.studentName}</p>
                        <p className="text-xs text-muted-foreground pt-1">{c.courseTitle}</p>
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
