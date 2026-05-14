import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorEnhancedStudents } from "@/server/actions/curator-enhanced";

export const dynamic = "force-dynamic";

export default async function CuratorStudentsPage() {
  await requireRolePage(["curator", "super_curator"]);
  const students = await getCuratorEnhancedStudents();

  return (
    <AppShell role="curator">
      <PageHeader title="Мои слушатели" description="Полный список закреплённых слушателей с прогрессом, потоком и активностью." />
      <div className="mt-6 border rounded-2xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слушатель</TableHead>
              <TableHead>Поток</TableHead>
              <TableHead>Прогресс</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Последний вход</TableHead>
              <TableHead>Риски</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.cohortName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.progress >= 80 ? "bg-emerald-500" : s.progress >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right">{s.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      s.progressStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                      s.progressStatus === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" :
                      s.progressStatus === "BLOCKED" ? "bg-red-50 text-red-700" :
                      "bg-gray-50 text-gray-500"
                    }>
                      {s.progressStatus === "COMPLETED" ? "Завершил" :
                       s.progressStatus === "IN_PROGRESS" ? "В процессе" :
                       s.progressStatus === "BLOCKED" ? "Заблокирован" : "Не начат"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.daysSinceLogin !== null
                      ? (s.daysSinceLogin === 0 ? "Сегодня" :
                         s.daysSinceLogin === 1 ? "Вчера" :
                         `${s.daysSinceLogin} дн. назад`)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {s.riskCount > 0 ? (
                      <Badge className={s.hasCriticalRisk ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}>
                        {s.riskCount} {s.riskCount === 1 ? "риск" : s.riskCount < 5 ? "риска" : "рисков"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Нет</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  У вас пока нет назначенных слушателей.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
