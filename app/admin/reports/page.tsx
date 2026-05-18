import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { ProgressStatus } from "@prisma/client";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRolePage(["admin"]);

  const [totalUsers, totalEnrollments, completedCourses, certsCount, courseStats, progressByCourse, completedByCourse] = await Promise.all([
    prisma.user.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { title: "asc" },
      take: QUERY_LIMITS.reportSummaryCourses,
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      _avg: { percent: true },
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      where: { status: ProgressStatus.COMPLETED },
      _count: { _all: true },
    }),
  ]);

  const avgProgressByCourse = new Map(progressByCourse.map((row) => [row.courseId, Math.round(row._avg.percent ?? 0)]));
  const completedCountByCourse = new Map(completedByCourse.map((row) => [row.courseId, row._count._all]));

  const coursesChart = courseStats.map((c) => {
    const completed = completedCountByCourse.get(c.id) ?? 0;
    const avgProgress = avgProgressByCourse.get(c.id) ?? 0;
    return { label: c.title, value: avgProgress, sublabel: `${completed}/${c._count.enrollments} завершили`, color: avgProgress > 75 ? "#16a34a" : avgProgress > 40 ? "#ca8a04" : "#dc2626" };
  });

  return (
    <AppShell role="admin">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики платформы." />

      {/* Metrics — M3 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20">
              <Icon name="group" className="text-[22px] text-m3-primary" />
            </span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalUsers}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Пользователей</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20">
              <Icon name="trending_up" className="text-[22px] text-m3-tertiary" />
            </span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalEnrollments}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Активных зачислений</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20">
              <Icon name="award_star" className="text-[22px] text-m3-primary" />
            </span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{completedCourses}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Завершили курс</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20">
              <Icon name="verified" className="text-[22px] text-m3-tertiary" />
            </span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{certsCount}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Сертификатов</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Progress chart — M3 */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart items={coursesChart} />
        </CardContent>
      </Card>

      {/* Report designer */}
      <div className="mb-6">
        <ReportDesigner />
      </div>

      {/* Quick download */}
      <DownloadReports reports={[
        {
          id: "progress",
          title: "Прогресс по курсам",
          desc: "Все зачисления и прогресс слушателей",
          icon: "group",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где отстает обучение и какие курсы требуют внимания.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Неактивные, просроченные, отстающие",
          icon: "warning",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие риски нужно разобрать по потокам и курсам.",
        },
        {
          id: "assignments",
          title: "Задания",
          desc: "Отправки, статусы проверки и баллы",
          icon: "checklist",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где накапливается очередь проверки.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Все выпущенные сертификаты",
          icon: "verified",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие сертификаты выпущены и по каким курсам.",
        },
        {
          id: "curator_workload",
          title: "Нагрузка кураторов",
          desc: "Очереди, риски и закрепленные слушатели",
          icon: "trending_up",
          owner: "Super curator operations",
          scope: "Вся академия",
          decision: "Где перегрузка и кого нужно перераспределить.",
        },
      ]} />
    </AppShell>
  );
}
