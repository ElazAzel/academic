import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold">{data.total}</p><p className="text-xs text-muted-foreground">Всего</p></CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{data.bySeverity.critical}</p><p className="text-xs text-muted-foreground">Критичных</p></CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{data.bySeverity.high}</p><p className="text-xs text-muted-foreground">Высоких</p></CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{data.bySeverity.medium}</p><p className="text-xs text-muted-foreground">Средних</p></CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{data.bySeverity.low}</p><p className="text-xs text-muted-foreground">Низких</p></CardContent>
        </Card>
      </div>

      {/* Filters + Create */}
      <RiskFilters cohorts={data.cohorts} curators={data.curators} />
      <RiskActions />

      {/* Table */}
      <Card className="rounded-2xl mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Студент</TableHead>
                <TableHead>Реальное имя</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Уровень</TableHead>
                <TableHead>Куратор</TableHead>
                <TableHead>Поток</TableHead>
                <TableHead>Курс</TableHead>
                <TableHead>Вход</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.risks.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Нет активных рисков</TableCell></TableRow>
              ) : data.risks.map((r) => (
                <TableRow key={r.id} className={r.severity === "critical" || r.severity === "high" ? "bg-red-50/30" : ""}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.studentRealName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{RISK_LABELS[r.type as keyof typeof RISK_LABELS] ?? r.type}</TableCell>
                  <TableCell>
                    <Badge className={
                      r.severity === "critical" ? "bg-red-100 text-red-700" :
                      r.severity === "high" ? "bg-orange-100 text-orange-700" :
                      r.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-green-100 text-green-700"
                    }>{r.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.curatorName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.cohortName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.courseTitle}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
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
