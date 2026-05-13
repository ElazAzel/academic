import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentAnalyticsTable } from "@/components/lms/student-analytics-table";
import { BarChart, DonutChart } from "@/components/lms/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import type { DashboardMetric } from "@/types/domain";
import { UserAccountStatus } from "@prisma/client";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { getAdminStudentAnalytics } from "@/server/actions/dashboard";

export const dynamic = "force-dynamic";

async function StudentAnalyticsTab() {
  const students = await getAdminStudentAnalytics();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Скачать отчёт:</span>
        <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">CSV</a>
        <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">Excel</a>
        <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">PDF</a>
      </div>
      <StudentAnalyticsTable students={students} />
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireRolePage(["admin"]);
  const prisma = getPrisma();

  const [
    activeUsersCount,
    avgProgressAgg,
    completedCount,
    certsCount,
    coursesDb,
    totalUsers,
    usersByStatus,
    recentUsers,
    roleGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { status: UserAccountStatus.ACTIVE } }),
    prisma.courseProgress.aggregate({ _avg: { percent: true } }),
    prisma.courseProgress.count({ where: { status: "COMPLETED" } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      include: {
        _count: { select: { enrollments: true } },
        courseProgress: { select: { status: true, percent: true } }
      }
    }),
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, email: true, status: true, createdAt: true },
    }),
    prisma.userRole.groupBy({
      by: ["roleId"],
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
  ]);

  const roleIds = roleGroups.map((r) => r.roleId);
  const roles = roleIds.length > 0 ? await prisma.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true, name: true },
  }) : [];
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  const activeFromStatus = usersByStatus.find((u) => u.status === UserAccountStatus.ACTIVE)?._count._all ?? 0;
  const inactiveFromStatus = usersByStatus.find((u) => u.status === UserAccountStatus.INACTIVE)?._count._all ?? 0;

  const metrics: DashboardMetric[] = [
    { label: "Активных пользователей", value: activeUsersCount, tone: "primary" },
    { label: "Средний прогресс", value: `${Math.round(avgProgressAgg._avg.percent ?? 0)}%`, tone: "success" },
    { label: "Завершивших курс", value: completedCount, tone: "info" },
    { label: "Сертификатов выдано", value: certsCount, tone: "warning" },
  ];

  const courseStats = coursesDb.map(c => {
    const enrollments = c._count.enrollments;
    const completed = c.courseProgress.filter(cp => cp.status === "COMPLETED").length;
    const avgProgress = enrollments > 0
      ? Math.round(c.courseProgress.reduce((acc, curr) => acc + curr.percent, 0) / enrollments)
      : 0;
    return { title: c.title, enrolled: enrollments, completed, avgProgress };
  });

  const bestCourse = [...courseStats].sort((a, b) => b.avgProgress - a.avgProgress)[0];

  return (
    <AppShell role="admin">
      <PageHeader title="Аналитика" description="Активность пользователей, завершения курсов, тесты и экспорт."/>
      <div className="space-y-6">
        <MetricGrid metrics={metrics}/>
        <Tabs tabs={[
          {
            label: "По курсам",
            content: courseStats.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Прогресс по курсам</CardTitle>
                    <CardDescription>Средний процент прохождения</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={courseStats.map((c) => ({
                        label: c.title,
                        value: c.avgProgress,
                        sublabel: `${c.enrolled} зачислено · ${c.completed} завершено`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Скачать отчёт:</span>
                  <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">CSV</a>
                  <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">Excel</a>
                  <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">PDF</a>
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Лучший курс</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-2 pt-2">
                      <DonutChart value={bestCourse?.avgProgress ?? 0} size={100} strokeWidth={6} />
                      <p className="text-sm font-medium text-center">{bestCourse?.title}</p>
                      <p className="text-xs text-muted-foreground">{bestCourse?.avgProgress}% средний прогресс</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Всего сертификатов</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-3xl font-bold">{certsCount}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Нет данных по курсам.</CardContent></Card>
            ),
          },
          {
            label: "По пользователям",
            content: (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Распределение по ролям</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={roleGroups.map((rg) => ({
                        label: roleMap.get(rg.roleId)?.name ?? rg.roleId,
                        value: rg._count._all,
                      }))}
                    />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Всего пользователей</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{totalUsers}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="text-green-600">{activeFromStatus} активных</span>
                        <span className="text-red-600">{inactiveFromStatus} неактивных</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Последние регистрации</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recentUsers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Нет пользователей</p>
                      ) : (
                        recentUsers.map((u) => (
                          <div key={u.email} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[120px]">{u.name ?? u.email}</span>
                            <span className={u.status === UserAccountStatus.ACTIVE ? "text-green-600" : "text-red-600"}>{u.status === UserAccountStatus.ACTIVE ? "Активен" : u.status === UserAccountStatus.INACTIVE ? "Неактивен" : u.status === UserAccountStatus.BLOCKED ? "Заблокирован" : "Удален"}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            label: "По слушателям",
            content: <StudentAnalyticsTab />,
          },
        ]}/>
      </div>
    </AppShell>
  );
}
