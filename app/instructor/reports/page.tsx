import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Icon } from "@/components/ui/icon";
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

      {/* Metrics — M3 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20"><Icon name="school" className="text-[22px] text-m3-primary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{courses.length}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Курсов</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20"><Icon name="trending_up" className="text-[22px] text-m3-tertiary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalStudents}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Слушателей</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20"><Icon name="award_star" className="text-[22px] text-m3-primary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{completed}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Завершили</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-secondary-container/20"><Icon name="trending_up" className="text-[22px] text-m3-secondary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{avgProgress}%</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний прогресс</p></div>
          </CardContent>
        </Card>
      </div>

      {courses.length > 0 && (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
          <CardHeader>
            <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
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
          icon: "group",
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие группы и уроки проседают по образовательному результату.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Риски по вашим курсам",
          icon: "warning",
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие риски мешают завершению курса.",
        },
        {
          id: "assignments",
          title: "Задания",
          desc: "Отправки и результаты по вашим курсам",
          icon: "checklist",
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Какие задания требуют методической проверки.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Сертификаты по вашим курсам",
          icon: "verified",
          owner: "Instructor",
          scope: "Только курсы преподавателя",
          decision: "Кто завершил курс и получил подтверждение.",
        },
      ]} />
    </AppShell>
  );
}
