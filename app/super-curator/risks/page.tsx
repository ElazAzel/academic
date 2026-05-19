import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getRiskOverview } from "@/server/actions/risk-management";
import { RISK_LABELS } from "@/types/domain";
import type { DashboardMetric } from "@/types/domain";
import { RiskFilters } from "./risk-filters";
import { RiskActions, ResolveRiskButton } from "./risk-actions";

export const dynamic = "force-dynamic";

export default async function SuperCuratorRisksPage(props: {
  searchParams?: Promise<{ cohortId?: string; curatorId?: string; type?: string; severity?: string; search?: string }>;
}) {
  await requireRolePage(["super_curator", "admin"]);
  const sp = await props.searchParams;
  const data = await getRiskOverview({
    cohortId: sp?.cohortId,
    curatorId: sp?.curatorId,
    type: sp?.type,
    severity: sp?.severity,
    search: sp?.search,
  });
  const urgentRisks = data.bySeverity.critical + data.bySeverity.high;
  const metrics = [
    {
      label: "Всего рисков",
      value: data.total,
      tone: data.total > 0 ? "warning" : "success",
      detail: `${urgentRisks} критичных/высоких`,
      priority: urgentRisks > 0 ? "elevated" : "normal",
    },
    {
      label: "Критичных",
      value: data.bySeverity.critical,
      tone: data.bySeverity.critical > 0 ? "danger" : "success",
      detail: "Нужна эскалация",
      href: "/super-curator/risks?severity=critical",
      priority: data.bySeverity.critical > 0 ? "critical" : "normal",
    },
    {
      label: "Высоких",
      value: data.bySeverity.high,
      tone: data.bySeverity.high > 0 ? "danger" : "success",
      detail: "В первую очередь",
      href: "/super-curator/risks?severity=high",
      priority: data.bySeverity.high > 0 ? "elevated" : "normal",
    },
    {
      label: "Средних",
      value: data.bySeverity.medium,
      tone: data.bySeverity.medium > 0 ? "warning" : "neutral",
      detail: "Контроль динамики",
    },
    {
      label: "Низких",
      value: data.bySeverity.low,
      tone: "info",
      detail: "Мониторинг",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="super_curator">
      <PageHeader title="Риски" description="Управление рисками: фильтры, создание, закрытие." />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {/* Filters + Create */}
      <RiskFilters cohorts={data.cohorts} curators={data.curators} />
      <RiskActions />

      {/* Table — M3 */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-m3-outline-variant">
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Студент</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Реальное имя</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Тип</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Уровень</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Куратор</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Поток</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Курс</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Вход</TableHead>
                <TableHead className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.risks.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="font-body-md text-body-md text-m3-on-surface-variant text-center py-8">Нет активных рисков</TableCell></TableRow>
              ) : data.risks.map((r) => (
                <TableRow key={r.id} className={r.severity === "critical" || r.severity === "high" ? "bg-m3-error-container/10" : ""}>
                  <TableCell>
                    <p className="font-label-md text-label-md text-m3-on-surface">{r.studentName}</p>
                    <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{r.studentEmail}</p>
                  </TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">{r.studentRealName ?? "—"}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface">{RISK_LABELS[r.type as keyof typeof RISK_LABELS] ?? r.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.severity === "critical" ? "destructive" : r.severity === "high" ? "destructive" : r.severity === "medium" ? "secondary" : "outline"}
                    >
                      {r.severity === "critical" ? "Критичный" :
                       r.severity === "high" ? "Высокий" :
                       r.severity === "medium" ? "Средний" : "Низкий"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface">{r.curatorName ?? "—"}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">{r.cohortName ?? "—"}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">{r.courseTitle}</TableCell>
                  <TableCell className="font-body-sm text-body-sm text-m3-on-surface-variant">
                    {r.daysSinceLogin !== null ? `${r.daysSinceLogin} дн.` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ResolveRiskButton riskId={r.id} />
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
