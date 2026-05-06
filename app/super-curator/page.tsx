import { AppShell } from "@/components/layout/app-shell";
import {
  MetricGrid,
  CuratorLoadTable,
  RisksList,
} from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import {
  getSuperCuratorMetrics,
  MOCK_CURATOR_LOADS,
  MOCK_RISKS,
  MOCK_COHORTS,
} from "@/lib/mock-data";

export default function SuperCuratorDashboardPage() {
  const metrics = getSuperCuratorMetrics();

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Дашборд супер-куратора"
        description="Нагрузка кураторов, распределение слушателей, риски потоков и SLA."
        badge="Супер-куратор"
      />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        <Tabs
          tabs={[
            {
              label: "Нагрузка кураторов",
              content: <CuratorLoadTable curators={MOCK_CURATOR_LOADS} />,
            },
            {
              label: "Потоки",
              content: (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {MOCK_COHORTS.map((c) => (
                    <Card key={c.id} className="rounded-2xl transition-shadow hover:shadow-panel">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {c.status === "active" ? "Активен" : "Завершён"}
                          </Badge>
                          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription>{c.courseTitle}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Слушатели</span>
                          <span className="font-medium">{c.studentsCount}</span>
                        </div>
                        {c.startsAt && c.endsAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.startsAt} — {c.endsAt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              label: `Риски (${MOCK_RISKS.length})`,
              content: <RisksList risks={MOCK_RISKS} />,
            },
            {
              label: "Нераспределённые",
              content: (
                <Card>
                  <CardHeader>
                    <CardTitle>Нераспределённые слушатели</CardTitle>
                    <CardDescription>
                      Слушатели, которым ещё не назначен куратор.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: "Слушатель 11", course: "AI Strategy Fundamentals" },
                      { name: "Слушатель 12", course: "Prompt Engineering for Leaders" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} />
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.course}</p>
                          </div>
                        </div>
                        <Button size="sm">Назначить</Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
