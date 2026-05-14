import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, DonutChart } from "@/components/lms/bar-chart";
import { Tabs } from "@/components/ui/tabs";
import { AlertTriangle, Clock, BookOpen, MessageSquare, UserX } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorRisks } from "@/server/actions/super-curator";
import { RISK_LABELS } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function SuperCuratorRisksPage() {
  await requireRolePage(["super_curator", "admin"]);
  const risks = await getSuperCuratorRisks();

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const typeCounts: Record<string, number> = {};
  for (const r of risks) {
    severityCounts[r.severity as keyof typeof severityCounts]++;
    typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
  }

  const totalRisks = risks.length;
  const criticalRisks = severityCounts.critical + severityCounts.high;

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Риски по потокам"
        description="Детальная информация о рисках: давно не заходили, отстают, просроченные модули."
      />

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold text-red-600">{criticalRisks}</p>
            <p className="text-xs text-muted-foreground">Критических</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{totalRisks}</p>
            <p className="text-xs text-muted-foreground">Всего рисков</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">
              {risks.filter((r) => r.daysSinceLastLogin !== null && r.daysSinceLastLogin > 14).length}
            </p>
            <p className="text-xs text-muted-foreground">Не заходили &gt;14 дн.</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{risks.filter((r) => r.progressPercent < 25).length}</p>
            <p className="text-xs text-muted-foreground">Прогресс &lt;25%</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">
              {[...new Set(risks.map((r) => r.cohortName).filter(Boolean))].length}
            </p>
            <p className="text-xs text-muted-foreground">Затронуто потоков</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">По уровням</CardTitle></CardHeader>
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
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-sm">По типам</CardTitle></CardHeader>
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

      {/* Risk table with detailed info */}
      <Tabs
        tabs={[
          { label: `Все риски (${risks.length})`, content: (
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Слушатель</TableHead>
                      <TableHead>Тип риска</TableHead>
                      <TableHead>Уровень</TableHead>
                      <TableHead>Прогресс</TableHead>
                      <TableHead>Вопросов</TableHead>
                      <TableHead>Заданий</TableHead>
                      <TableHead>Последний вход</TableHead>
                      <TableHead>Поток</TableHead>
                      <TableHead>Создан</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Нет активных рисков</TableCell></TableRow>
                    ) : risks.map((r) => (
                      <TableRow key={r.id} className={r.severity === "critical" || r.severity === "high" ? "bg-red-50/30" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar name={r.studentName} className="h-7 w-7 text-[10px]" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.studentName}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.studentEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {r.type === "inactive_login" && <UserX className="h-3.5 w-3.5 text-amber-500" />}
                            {r.type === "inactive_learning" && <Clock className="h-3.5 w-3.5 text-orange-500" />}
                            {r.type === "overdue_module" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                            <span className="text-xs">{RISK_LABELS[r.type as keyof typeof RISK_LABELS] ?? r.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            r.severity === "critical" ? "bg-red-100 text-red-700" :
                            r.severity === "high" ? "bg-orange-100 text-orange-700" :
                            r.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }>
                            {r.severity === "critical" ? "Критичный" :
                             r.severity === "high" ? "Высокий" :
                             r.severity === "medium" ? "Средний" : "Низкий"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${r.progressPercent < 25 ? "bg-red-500" : r.progressPercent < 50 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${r.progressPercent}%` }} />
                            </div>
                            <span className="text-xs tabular-nums">{r.progressPercent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{r.openQuestions}</TableCell>
                        <TableCell className="text-xs">{r.pendingAssignments}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.daysSinceLastLogin !== null
                            ? `${r.daysSinceLastLogin} дн. назад`
                            : r.lastLoginAt
                            ? new Date(r.lastLoginAt).toLocaleDateString("ru")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.cohortName ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )},
          { label: `Критические (${criticalRisks})`, content: (
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Слушатель</TableHead>
                      <TableHead>Тип риска</TableHead>
                      <TableHead>Прогресс</TableHead>
                      <TableHead>Последний вход</TableHead>
                      <TableHead>Вопросов</TableHead>
                      <TableHead>Поток</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.filter((r) => r.severity === "critical" || r.severity === "high").length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет критических рисков</TableCell></TableRow>
                    ) : risks.filter((r) => r.severity === "critical" || r.severity === "high").map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar name={r.studentName} className="h-7 w-7 text-[10px]" />
                            <span className="text-sm font-medium">{r.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{RISK_LABELS[r.type as keyof typeof RISK_LABELS] ?? r.type}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${r.progressPercent < 25 ? "text-red-600" : ""}`}>
                            {r.progressPercent}%
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.daysSinceLastLogin !== null ? `${r.daysSinceLastLogin} дн.` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.openQuestions}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.cohortName ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )},
        ]}
      />
    </AppShell>
  );
}
