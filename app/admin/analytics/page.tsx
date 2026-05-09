import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { DashboardMetric } from "@/types/domain";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireRolePage(["admin"]);
  const prisma = getPrisma();

  // Реальный сбор данных для админ-аналитики
  const [
    activeUsersCount,
    avgProgressAgg,
    completedCount,
    certsCount,
    coursesDb
  ] = await Promise.all([
    prisma.user.count({ where: { status: "active" } }),
    prisma.courseProgress.aggregate({ _avg: { percent: true } }),
    prisma.courseProgress.count({ where: { status: "COMPLETED" } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      include: {
        _count: { select: { enrollments: true } },
        courseProgress: { select: { status: true, percent: true } }
      }
    })
  ]);

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

    return {
      title: c.title,
      enrolled: enrollments,
      completed,
      avgProgress
    };
  });

  return (
    <AppShell role="admin">
      <PageHeader title="Аналитика" description="Активность пользователей, завершения курсов, тесты и экспорт." badge="Администратор" />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <Tabs tabs={[
          {
            label: "По курсам",
            content: (
              <div className="space-y-3">
                {courseStats.map((c) => (
                  <Card key={c.title} className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{c.title}</p>
                        <span className="text-xs text-muted-foreground">{c.enrolled} зачислено · {c.completed} завершено</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={c.avgProgress} className="flex-1" />
                        <span className="text-sm font-medium w-10 text-right">{c.avgProgress}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            label: "По пользователям",
            content: (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <p className="text-sm">Детальная аналитика по пользователям будет доступна в следующем обновлении.</p>
                </CardContent>
              </Card>
            ),
          },
        ]} />
      </div>
    </AppShell>
  );
}
