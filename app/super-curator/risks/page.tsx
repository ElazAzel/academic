import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getRiskOverview } from "@/server/actions/risk-management";
import { RISK_LABELS } from "@/types/domain";
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

  return (
    <AppShell role="super_curator">
      <PageHeader title="Риски" description="Управление рисками: фильтры, создание, закрытие." />

      {/* Summary — M3 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 text-center"><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{data.total}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Всего</p></CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 text-center"><p className="font-display-lg text-m3-headline-large text-m3-error">{data.bySeverity.critical}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Критичных</p></CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 text-center"><p className="font-display-lg text-m3-headline-large text-m3-error">{data.bySeverity.high}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Высоких</p></CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 text-center"><p className="font-display-lg text-m3-headline-large text-m3-tertiary">{data.bySeverity.medium}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Средних</p></CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 text-center"><p className="font-display-lg text-m3-headline-large text-m3-primary">{data.bySeverity.low}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Низких</p></CardContent>
        </Card>
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
