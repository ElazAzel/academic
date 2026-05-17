import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Award, ClipboardCheck, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function InstructorReportsPage() {
  await requireRolePage(["instructor", "admin"]);
  const user = await getCurrentUser();
  if (!user) return null;

  const courses = await prisma.course.findMany({
    where: { instructors: { some: { userId: user.id } } },
    select: {
      title: true,
      _count: { select: { enrollments: true } },
      courseProgress: { select: { percent: true, status: true } },
    },
  });

  const totalStudents = courses.reduce((s, c) => s + c._count.enrollments, 0);
  const completed = courses.reduce((s, c) => s + c.courseProgress.filter((p) => p.status === "COMPLETED").length, 0);
  const avgProgress = totalStudents > 0
    ? Math.round(courses.reduce((s, c) => s + c.courseProgress.reduce((a, p) => a + p.percent, 0), 0) / totalStudents)
    : 0;

  return (
    <AppShell role="instructor">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики по вашим курсам." />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold">{courses.length}</p><p className="text-xs text-muted-foreground">Курсов</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div><p className="text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Слушателей</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <div><p className="text-2xl font-bold">{completed}</p><p className="text-xs text-muted-foreground">Завершили</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <div><p className="text-2xl font-bold">{avgProgress}%</p><p className="text-xs text-muted-foreground">Средний прогресс</p></div>
          </CardContent>
        </Card>
      </div>

      {courses.length > 0 && (
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-base">Прогресс по курсам</CardTitle>
            <CardDescription>Средний процент прохождения</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              items={courses.map((c) => {
                const enrollments = c._count.enrollments || 1;
                const avg = Math.round(c.courseProgress.reduce((s, p) => s + p.percent, 0) / enrollments);
                const compl = c.courseProgress.filter((p) => p.status === "COMPLETED").length;
                return {
                  label: c.title,
                  value: avg,
                  sublabel: `${compl}/${c._count.enrollments} завершили`,
                  color: avg > 75 ? "#16a34a" : avg > 40 ? "#ca8a04" : "#dc2626",
                };
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* Download reports */}
      <DownloadReports reports={[
        {
          id: "progress",
          title: "Прогресс слушателей",
          desc: "Прогресс по вашим курсам",
          icon: Users,
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие группы и уроки проседают по образовательному результату.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Риски по вашим курсам",
          icon: AlertTriangle,
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие риски мешают завершению курса.",
        },
        {
          id: "assignments",
          title: "Задания",
          desc: "Отправки и результаты по вашим курсам",
          icon: ClipboardCheck,
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие задания требуют методической проверки.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Сертификаты по вашим курсам",
          icon: Award,
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Кто завершил курс и получил подтверждение.",
        },
      ]} />
    </AppShell>
  );
}
