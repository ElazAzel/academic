import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/lms/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { UserPlus, Users2, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Управление — Администрирование",
  description: "Панель управления платформой.",
};


const prisma = getPrisma();
export const dynamic = "force-dynamic";

export default async function AdminManagementPage() {
  await requireRolePage(["admin"]);

  const [users, cohorts, enrollments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, status: true, createdAt: true,
        roles: { select: { role: { select: { key: true } } } },
        enrollments: { select: { id: true, course: { select: { title: true } }, status: true, cohort: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.cohort.findMany({
      select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
  ]);

  const totalEnrollments = enrollments;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const blockedUsers = users.filter((user) => user.status === "BLOCKED").length;
  const activeCohorts = cohorts.filter((cohort) => cohort.status === "active").length;
  const metrics = [
    {
      label: "Пользователей",
      value: users.length,
      tone: "primary",
      detail: `${activeUsers} активных`,
      href: "/admin/users",
    },
    {
      label: "Потоков",
      value: cohorts.length,
      tone: cohorts.length > 0 ? "info" : "neutral",
      detail: `${activeCohorts} активных`,
      href: "/admin/cohorts",
    },
    {
      label: "Активных зачислений",
      value: totalEnrollments,
      tone: totalEnrollments > 0 ? "success" : "neutral",
      detail: "На курсах",
      href: "/admin/enrollments",
    },
    {
      label: "Блокировки",
      value: blockedUsers,
      tone: blockedUsers > 0 ? "danger" : "success",
      detail: "Пользователи со статусом BLOCKED",
      priority: blockedUsers > 0 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="admin">
      <PageHeader
        title="Управление платформой"
        description="Пользователи, потоки и зачисления в одном месте."
      >
        <div className="flex gap-2 mt-4">
          <Button asChild size="sm">
            <Link href="/admin/users">
              <UserPlus className="h-4 w-4 mr-1" />
              Создать пользователя
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/admin/enrollments">
              <GraduationCap className="h-4 w-4 mr-1" />
              Зачислить на курс
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/admin/cohorts">
              <Users2 className="h-4 w-4 mr-1" />
              Потоки
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="mt-6 mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Пользователи и их зачисления</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Роли</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Зачисления</TableHead>
                  <TableHead>Поток</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{u.name || "Без имени"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.role.key} className="text-[10px] capitalize">
                            {r.role.key === "super_curator" ? "супер-куратор" : r.role.key}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status === "ACTIVE" ? "ACTIVE" : "BLOCKED"} label={u.status === "ACTIVE" ? "Активен" : u.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {u.enrollments.length > 0 ? u.enrollments.map((e) => (
                          <div key={e.id} className="flex items-center gap-1 text-xs">
                            <StatusBadge status={e.status === "COMPLETED" ? "COMPLETED" : e.status === "ACTIVE" ? "ACTIVE" : "BLOCKED"} label={e.status === "ACTIVE" ? "Активен" : e.status === "COMPLETED" ? "Завершён" : e.status} />
                            <span className="truncate max-w-[150px]">{e.course.title}</span>
                          </div>
                        )) : <span className="text-xs text-muted-foreground">Нет зачислений</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.enrollments.filter(e => e.cohort).map(e => e.cohort!.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
