import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/ui/icon";
import { BarChart } from "@/components/lms/bar-chart";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorEnhancedRisks } from "@/server/actions/curator-enhanced";
import { RISK_LABELS } from "@/types/domain";
import type { DashboardMetric } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function CuratorRisksPage() {
  await requireRolePage(["curator", "super_curator"]);
  const risks = await getCuratorEnhancedRisks();

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const typeCounts: Record<string, number> = {};
  for (const r of risks) {
    severityCounts[r.severity as keyof typeof severityCounts]++;
    typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
  }
  const criticalAndHigh = severityCounts.critical + severityCounts.high;
  const staleLoginCount = risks.filter((r) => r.daysSinceLogin !== null && r.daysSinceLogin > 14).length;
  const lowProgressCount = risks.filter((r) => r.progressPercent < 25).length;
  const metrics = [
    {
      label: "Критичных",
      value: criticalAndHigh,
      tone: criticalAndHigh > 0 ? "danger" : "success",
      detail: `${severityCounts.critical} критических, ${severityCounts.high} высоких`,
      priority: criticalAndHigh > 0 ? "critical" : "normal",
    },
    {
      label: "Всего рисков",
      value: risks.length,
      tone: risks.length > 0 ? "warning" : "success",
    },
    {
      label: "Не заходили >14 дн.",
      value: staleLoginCount,
      tone: staleLoginCount > 0 ? "danger" : "success",
      priority: staleLoginCount > 0 ? "elevated" : "normal",
    },
    {
      label: "Прогресс <25%",
      value: lowProgressCount,
      tone: lowProgressCount > 0 ? "danger" : "success",
      priority: lowProgressCount > 0 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="curator">
      <PageHeader
        title="Риски слушателей"
        description="Детальная информация о рисках: неактивные, просроченные, отстающие."
      />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {/* Charts — M3 */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader><CardTitle className="font-label-lg text-label-lg text-m3-on-surface">По уровням</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              items={[
                { label: "Критичный", value: severityCounts.critical, color: "#dc2626" },
                { label: "Высокий", value: severityCounts.high, color: "#ea580c" },
                { label: "Средний", value: severityCounts.medium, color: "#ca8a04" },
                { label: "Низкий", value: severityCounts.low, color: "#16a34a" },
              ]}
            />
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader><CardTitle className="font-label-lg text-label-lg text-m3-on-surface">По типам</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              items={Object.entries(typeCounts).map(([type, count]) => ({
                label: RISK_LABELS[type as keyof typeof RISK_LABELS] ?? type,
                value: count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Risk table — M3 */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-m3-outline-variant">
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Слушатель</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Тип риска</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Уровень</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Прогресс</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Вопросов</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Заданий</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Последний вход</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="font-body-md text-body-md text-m3-on-surface-variant text-center py-8">Нет активных рисков</TableCell></TableRow>
              ) : risks.map((r) => (
                <TableRow key={r.id} className={r.severity === "critical" || r.severity === "high" ? "bg-m3-error-container/10" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={r.studentName} className="h-7 w-7 text-[10px]" />
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md text-m3-on-surface truncate">{r.studentName}</p>
                        <p className="font-body-sm text-body-sm text-m3-on-surface-variant truncate">{r.studentEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.type === "inactive_login" && <Icon name="person_off" className="text-[16px] text-m3-error" />}
                      {r.type === "inactive_learning" && <Icon name="schedule" className="text-[16px] text-m3-tertiary" />}
                      {r.type === "overdue_module" && <Icon name="warning" className="text-[16px] text-m3-error" />}
                      <span className="font-body-sm text-body-sm">{RISK_LABELS[r.type as keyof typeof RISK_LABELS] ?? r.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.severity === "critical" ? "destructive" : r.severity === "high" ? "destructive" : r.severity === "medium" ? "secondary" : "outline"}
                    >
                      {r.severity === "critical" ? "Критичный" :
                       r.severity === "high" ? "Высокий" :
                       r.severity === "medium" ? "Средний" : "Низкий"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-m3-surface-variant overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${r.progressPercent < 25 ? "bg-m3-error" : r.progressPercent < 50 ? "bg-m3-tertiary" : "bg-m3-primary"}`}
                          style={{ width: `${r.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-body-sm text-body-sm tabular-nums text-m3-on-surface">{r.progressPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface">{r.openQuestions}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface">{r.pendingAssignments}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">
                    {r.daysSinceLogin !== null ? `${r.daysSinceLogin} дн. назад` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
