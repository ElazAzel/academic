import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { notFound } from "next/navigation";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCohortDetail } from "@/server/actions/super-curator";
import { EditCohortForm } from "../cohort-form";
import { AddStudentForm } from "./add-student-form";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Когорта — Супер-куратор",
  description: "Детали когорты.",
};


export const dynamic = "force-dynamic";

export default async function CohortDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireRolePage(["super_curator", "admin"]);
  const cohort = await getCohortDetail(id);
  if (!cohort) notFound();
  const completedCount = cohort.students.filter((s) => s.progressStatus === "COMPLETED").length;
  const laggingCount = cohort.students.filter((s) => s.progress < 25 && s.progressStatus !== "COMPLETED").length;
  const unassignedCount = cohort.students.filter((s) => !s.curator).length;
  const avgProgress = cohort.students.length > 0
    ? Math.round(cohort.students.reduce((sum, student) => sum + student.progress, 0) / cohort.students.length)
    : 0;
  const metrics = [
    {
      label: "Слушателей",
      value: cohort.students.length,
      tone: "primary",
      detail: `${cohort.curators.length} кураторов`,
    },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
      detail: `${completedCount} завершили`,
    },
    {
      label: "Отстающие",
      value: laggingCount,
      tone: laggingCount > 0 ? "danger" : "success",
      detail: "Ниже 25%",
      priority: laggingCount > 0 ? "elevated" : "normal",
    },
    {
      label: "Без куратора",
      value: unassignedCount,
      tone: unassignedCount > 0 ? "warning" : "success",
      detail: "Нужно распределить",
      priority: unassignedCount > 0 ? "elevated" : "normal",
      href: "/super-curator/distribution",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="super_curator">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title={cohort.name} description={cohort.courseTitle} />
        <div className="flex items-center gap-2">
          <EditCohortForm
            cohort={{
              id: cohort.id,
              name: cohort.name,
              startsAt: cohort.startsAt,
              endsAt: cohort.endsAt,
              status: cohort.status,
            }}
          />
          <AddStudentForm cohortId={cohort.id} courseTitle={cohort.courseTitle} courseId={cohort.courseId} />
        </div>
      </div>

      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        {/* Curators assigned */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Назначенные кураторы</CardTitle>
          </CardHeader>
          <CardContent>
            {cohort.curators.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Нет назначенных кураторов. Распределите слушателей через раздел &laquo;Распределение&raquo;.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {cohort.curators.map((cur) => (
                  <a
                    key={cur.id}
                    href={`/super-curator/curators/${cur.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 transition-colors hover:bg-accent"
                  >
                    <Avatar name={cur.name} className="h-7 w-7 text-[10px]" />
                    <div>
                      <p className="text-sm font-medium">{cur.name}</p>
                      <p className="text-xs text-muted-foreground">{cur.studentIds.length} слушателей</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Участники потока ({cohort.students.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Слушатель</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Куратор</TableHead>
                  <TableHead>Последний вход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohort.students.map((s) => (
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{s.progress}%</span>
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
                         s.progressStatus === "BLOCKED" ? "Заблокирован" :
                         "Не начат"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.curator ? (
                        <a href={`/super-curator/curators/${s.curator.id}`} className="hover:underline">
                          {s.curator.name ?? s.curator.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">Не назначен</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString("ru") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
