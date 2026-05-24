import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { EmptyState } from "@/components/lms/empty-state";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { getDisplayReportsForRole } from "@/server/modules/reports/service";
import { BarChart3 } from "lucide-react";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Отчёты — Студент",
  description: "Отчёты по успеваемости.",
};


const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function StudentReportsPage() {
  const user = await requireRolePage(["student"]);

  const [enrollments, certificatesCount, quizAttempts, assignmentsSubmitted] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        course: { select: { id: true, title: true } },
        courseProgress: { select: { percent: true, status: true } },
        cohort: { select: { name: true } },
      },
    }),
    prisma.certificate.count({ where: { userId: user.id } }),
    prisma.quizAttempt.count({ where: { userId: user.id } }),
    prisma.assignmentSubmission.count({ where: { userId: user.id } }),
  ]);

  const completedCourses = enrollments.filter(
    (e) => e.courseProgress[0]?.status === "COMPLETED",
  ).length;

  const avgPercent = enrollments.length > 0
    ? Math.round(
        enrollments.reduce((s, e) => s + (e.courseProgress[0]?.percent ?? 0), 0) / enrollments.length,
      )
    : 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Активные курсы",
      value: enrollments.length,
      tone: enrollments.length > 0 ? "primary" : "neutral",
      detail: `${completedCourses} завершено`,
    },
    {
      label: "Средний прогресс",
      value: `${avgPercent}%`,
      tone: avgPercent >= 70 ? "success" : avgPercent >= 35 ? "warning" : "danger",
    },
    {
      label: "Сертификаты",
      value: certificatesCount,
      tone: "success",
    },
    {
      label: "Попытки тестов",
      value: quizAttempts,
      tone: "info",
      detail: `${assignmentsSubmitted} отправок заданий`,
    },
  ];

  if (enrollments.length === 0 && certificatesCount === 0) {
    return (
      <AppShell role="student">
        <PageHeader
          title="Отчёты"
          description="Ваша статистика обучения и экспорт данных."
        />
        <EmptyState
          icon={BarChart3}
          title="Нет данных для отчётов"
          description="Запишитесь на курсы, чтобы увидеть статистику."
        />
      </AppShell>
    );
  }

  const coursesChart = enrollments.map((e) => ({
    label: e.course.title,
    value: e.courseProgress[0]?.percent ?? 0,
    sublabel: e.cohort?.name ?? "Без потока",
    color: (e.courseProgress[0]?.percent ?? 0) > 75
      ? "#16a34a"
      : (e.courseProgress[0]?.percent ?? 0) > 40
        ? "#ca8a04"
        : "#dc2626",
  }));

  return (
    <AppShell role="student">
      <PageHeader
        title="Отчёты"
        description="Ваша статистика обучения и экспорт данных."
      />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {/* Chart: progress by course */}
      {coursesChart.length > 0 && (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
          <CardHeader>
            <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">
              Мой прогресс по курсам
            </CardTitle>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
              Процент прохождения каждого курса
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart items={coursesChart} />
          </CardContent>
        </Card>
      )}

      {/* Download reports — student sees only their own data */}
      <DownloadReports reports={getDisplayReportsForRole(user.roles)} />
    </AppShell>
  );
}
