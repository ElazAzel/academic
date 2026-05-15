import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Users, AlertTriangle, Award, TrendingUp } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRolePage(["admin"]);

  const [totalUsers, totalEnrollments, completedCourses, certsCount, courseStats] = await Promise.all([
    prisma.user.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.courseProgress.count({ where: { status: "COMPLETED" } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      select: {
        title: true,
        _count: { select: { enrollments: true } },
        courseProgress: { select: { percent: true, status: true } },
      },
    }),
  ]);

  const coursesChart = courseStats.map((c) => {
    const total = c._count.enrollments || 1;
    const completed = c.courseProgress.filter((p) => p.status === "COMPLETED").length;
    const avgProgress = total > 0 ? Math.round(c.courseProgress.reduce((s, p) => s + p.percent, 0) / total) : 0;
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

      {/* Download reports */}
      <DownloadReports reports={[
        { id: "progress", title: "Прогресс по курсам", desc: "Все зачисления и прогресс слушателей", icon: Users },
        { id: "risk", title: "Риски слушателей", desc: "Неактивные, просроченные, отстающие", icon: AlertTriangle },
        { id: "certificates", title: "Сертификаты", desc: "Все выпущенные сертификаты", icon: Award, formats: ["csv", "xlsx", "pdf"] },
      ]} />
    </AppShell>
  );
}
