import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentAnalyticsTable } from "@/components/lms/student-analytics-table";
import { BarChart, DonutChart } from "@/components/lms/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { QUERY_LIMITS } from "@/lib/query-limits";
import type { DashboardMetric } from "@/types/domain";
import { ProgressStatus, UserAccountStatus } from "@prisma/client";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { getAdminStudentAnalytics } from "@/server/actions/dashboard";
import { getActivityAnalytics } from "@/server/actions/activity-analytics";
import { ActivityFilters } from "@/components/admin/activity-filters";
import { VisitAnalyticsBlock } from "@/components/admin/visit-analytics-block";

export const dynamic = "force-dynamic";

async function StudentAnalyticsTab() {
  const students = await getAdminStudentAnalytics();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-body-sm text-body-sm text-m3-on-surface-variant mr-1">Скачать отчёт:</span>
        <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
          <Icon name="download" className="text-[16px]" /> CSV
        </a>
        <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
          <Icon name="download" className="text-[16px]" /> Excel
        </a>
        <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
          <Icon name="download" className="text-[16px]" /> PDF
        </a>
      </div>
      <StudentAnalyticsTable students={students} />
    </div>
  );
}

async function ActivityTab(props: { searchParams?: Promise<{ days?: string; cohortId?: string; courseId?: string }> }) {
  const sp = await props.searchParams;
  const days = Math.min(Math.max(parseInt(sp?.days ?? "30", 10) || 30, 7), 180);
  const cohortId = sp?.cohortId || undefined;
  const courseId = sp?.courseId || undefined;
  const activity = await getActivityAnalytics(days, cohortId, courseId);
  const activeDays = activity.daily.logins.filter((value) => value > 0).length;
  const activityMetrics = [
    {
      label: "Входов",
      value: activity.totals.totalLogins,
      tone: activity.totals.totalLogins > 0 ? "primary" : "neutral",
      detail: `За ${days} дней`,
    },
    {
      label: "В среднем в день",
      value: activity.totals.avgDailyLogins,
      tone: "info",
      detail: `${activeDays} активных дней`,
    },
    {
      label: "Новых зачислений",
      value: activity.totals.totalEnrollments,
      tone: activity.totals.totalEnrollments > 0 ? "success" : "neutral",
      detail: "По выбранному срезу",
    },
    {
      label: "Активных дней",
      value: activeDays,
      tone: activeDays < Math.ceil(days / 2) ? "warning" : "success",
      detail: `${days - activeDays} дней без входов`,
      priority: activeDays < Math.ceil(days / 2) ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <div className="space-y-6">
      <ActivityFilters
        days={days}
        cohortId={cohortId ?? null}
        courseId={courseId ?? null}
        cohorts={activity.filters.cohorts}
        courses={activity.filters.courses}
      />

      <MetricGrid metrics={activityMetrics} />

      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Ежедневные входы ({days} дней)</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart items={activity.daily.labels.map((label, i) => ({
            label,
            value: activity.daily.logins[i],
            color: activity.daily.logins[i] > activity.totals.avgDailyLogins ? "#16a34a" : "#ca8a04",
          }))} />
        </CardContent>
      </Card>

      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Еженедельные зачисления</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart items={activity.weekly.labels.map((label, i) => ({
            label,
            value: activity.weekly.enrollments[i],
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}

async function VisitTab(props: { searchParams?: Promise<{ days?: string; roleFilter?: string }> }) {
  const sp = await props.searchParams;
  const days = Math.min(Math.max(parseInt(sp?.days ?? "30", 10) || 30, 1), 180);
  const roleFilter = sp?.roleFilter || undefined;
  return <VisitAnalyticsBlock days={days} roleFilter={roleFilter} />;
}

export default async function AdminAnalyticsPage(props: { searchParams?: Promise<{ days?: string; cohortId?: string; courseId?: string }> }) {
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
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      take: QUERY_LIMITS.reportSummaryCourses,
      include: {
        _count: { select: { enrollments: true } },
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
  const courseIds = coursesDb.map((course) => course.id);
  const [courseProgressAverages, courseCompletedCounts] = courseIds.length > 0
    ? await Promise.all([
        prisma.courseProgress.groupBy({
          by: ["courseId"],
          where: { courseId: { in: courseIds } },
          _avg: { percent: true },
        }),
        prisma.courseProgress.groupBy({
          by: ["courseId"],
          where: { courseId: { in: courseIds }, status: ProgressStatus.COMPLETED },
          _count: { _all: true },
        }),
      ])
    : [[], []] as const;
  const avgProgressByCourse = new Map(
    courseProgressAverages.map((row) => [row.courseId, Math.round(row._avg.percent ?? 0)]),
  );
  const completedByCourse = new Map(
    courseCompletedCounts.map((row) => [row.courseId, row._count._all]),
  );

  const activeFromStatus = usersByStatus.find((u) => u.status === UserAccountStatus.ACTIVE)?._count._all ?? 0;
  const inactiveFromStatus = usersByStatus.find((u) => u.status === UserAccountStatus.INACTIVE)?._count._all ?? 0;
  const avgProgress = Math.round(avgProgressAgg._avg.percent ?? 0);

  const metrics: DashboardMetric[] = [
    {
      label: "Активных пользователей",
      value: activeUsersCount,
      tone: "primary",
      detail: `${inactiveFromStatus} неактивных`,
      href: "/admin/users",
    },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
      detail: `${courseIds.length} курсов в срезе`,
    },
    {
      label: "Завершивших курс",
      value: completedCount,
      tone: "info",
      detail: `${certsCount} сертификатов выдано`,
    },
    {
      label: "Всего пользователей",
      value: totalUsers,
      tone: activeUsersCount === 0 && totalUsers > 0 ? "warning" : "neutral",
      detail: `${activeFromStatus} активных по статусу`,
    },
  ];

  const courseStats = coursesDb.map(c => {
    const enrollments = c._count.enrollments;
    const completed = completedByCourse.get(c.id) ?? 0;
    const avgProgress = avgProgressByCourse.get(c.id) ?? 0;
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
                <Card className="md:col-span-2 border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
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
                  <span className="font-body-sm text-body-sm text-m3-on-surface-variant mr-1">Скачать отчёт:</span>
                  <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> CSV
                  </a>
                  <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> Excel
                  </a>
                  <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> PDF
                  </a>
                </div>
                <div className="space-y-4">
                  <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-label-md text-label-md text-m3-on-surface">Лучший курс</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-2 pt-2">
                      <DonutChart value={bestCourse?.avgProgress ?? 0} size={100} strokeWidth={6} />
                      <p className="font-label-md text-label-md text-m3-on-surface text-center">{bestCourse?.title}</p>
                      <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{bestCourse?.avgProgress}% средний прогресс</p>
                    </CardContent>
                  </Card>
                  <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-label-md text-label-md text-m3-on-surface">Всего сертификатов</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-display-lg font-bold text-m3-on-surface">{certsCount}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="border-m3-outline-variant bg-m3-surface-container-lowest"><CardContent className="py-10 text-center font-body-md text-body-md text-m3-on-surface-variant">Нет данных по курсам.</CardContent></Card>
            ),
          },
          {
            label: "По пользователям",
            content: (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Распределение по ролям</CardTitle>
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
                  <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-label-md text-label-md text-m3-on-surface">Всего пользователей</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-display-lg font-bold text-m3-on-surface">{totalUsers}</p>
                      <div className="flex gap-4 mt-2 font-body-sm text-body-sm text-m3-on-surface-variant">
                        <span className="text-m3-primary">{activeFromStatus} активных</span>
                        <span className="text-m3-error">{inactiveFromStatus} неактивных</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-label-md text-label-md text-m3-on-surface">Последние регистрации</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recentUsers.length === 0 ? (
                        <p className="font-body-sm text-body-sm text-m3-on-surface-variant">Нет пользователей</p>
                      ) : (
                        recentUsers.map((u) => (
                          <div key={u.email} className="flex items-center justify-between font-body-sm text-body-sm">
                            <span className="truncate max-w-[120px] text-m3-on-surface">{u.name ?? u.email}</span>
                            <span className={u.status === UserAccountStatus.ACTIVE ? "text-m3-primary" : "text-m3-error"}>
                              {u.status === UserAccountStatus.ACTIVE ? "Активен" : u.status === UserAccountStatus.INACTIVE ? "Неактивен" : u.status === UserAccountStatus.BLOCKED ? "Заблокирован" : "Удален"}
                            </span>
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
          {
            label: "Посещения",
            content: <VisitTab searchParams={props.searchParams as Promise<{ days?: string; roleFilter?: string }>} />,
          },
          {
            label: "Активность",
            content: <ActivityTab searchParams={props.searchParams} />,
          },
        ]}/>
      </div>
    </AppShell>
  );
}
