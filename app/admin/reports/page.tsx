import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { ClipboardCheck, Users, AlertTriangle, Award, TrendingUp } from "lucide-react";
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

      {/* Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold">{totalUsers}</p><p className="text-xs text-muted-foreground">Пользователей</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div><p className="text-2xl font-bold">{totalEnrollments}</p><p className="text-xs text-muted-foreground">Активных зачислений</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <Award className="h-5 w-5 text-emerald-600" />
            <div><p className="text-2xl font-bold">{completedCourses}</p><p className="text-xs text-muted-foreground">Завершили курс</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <Award className="h-5 w-5 text-amber-600" />
            <div><p className="text-2xl font-bold">{certsCount}</p><p className="text-xs text-muted-foreground">Сертификатов</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Progress chart */}
      <Card className="rounded-2xl mb-6">
        <CardHeader>
          <CardTitle className="text-base">Прогресс по курсам</CardTitle>
          <CardDescription>Средний процент прохождения</CardDescription>
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
          icon: Users,
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где отстает обучение и какие курсы требуют внимания.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Неактивные, просроченные, отстающие",
          icon: AlertTriangle,
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие риски нужно разобрать по потокам и курсам.",
        },
        {
          id: "assignments",
          title: "Задания",
          desc: "Отправки, статусы проверки и баллы",
          icon: ClipboardCheck,
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где накапливается очередь проверки.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Все выпущенные сертификаты",
          icon: Award,
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие сертификаты выпущены и по каким курсам.",
        },
        {
          id: "curator_workload",
          title: "Нагрузка кураторов",
          desc: "Очереди, риски и закрепленные слушатели",
          icon: TrendingUp,
          owner: "Super curator operations",
          scope: "Вся академия",
          decision: "Где перегрузка и кого нужно перераспределить.",
        },
      ]} />
    </AppShell>
  );
}
