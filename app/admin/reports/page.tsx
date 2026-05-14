import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { Download, Users, AlertTriangle, Award, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";

const FORMATS = [
  { id: "csv" as const, label: "CSV", icon: FileText },
  { id: "xlsx" as const, label: "Excel", icon: FileSpreadsheet },
  { id: "pdf" as const, label: "PDF", icon: FileText },
];

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

      {/* Download cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { id: "progress", title: "Прогресс по курсам", desc: "Все зачисления и прогресс", icon: Users, formats: ["csv", "xlsx", "pdf"] },
          { id: "risk", title: "Риски слушателей", desc: "Неактивные, просроченные", icon: AlertTriangle, formats: ["csv", "xlsx", "pdf"] },
          { id: "certificates", title: "Сертификаты", desc: "Все выпущенные сертификаты", icon: Award, formats: ["csv", "xlsx"] },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="rounded-2xl transition-all hover:shadow-lg">
              <CardHeader>
                <Icon className="h-5 w-5 text-primary mb-1" />
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.filter((f) => r.formats.includes(f.id)).map((fmt) => {
                    const FmtIcon = fmt.icon;
                    return (
                      <a key={fmt.id} href={`/api/v1/reports?type=${r.id}&format=${fmt.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">
                        <FmtIcon className="h-3.5 w-3.5" />{fmt.label}<Download className="h-3 w-3 ml-0.5 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
