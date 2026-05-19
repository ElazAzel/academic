import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Icon } from "@/components/ui/icon";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorReportData } from "@/server/actions/curator-enhanced";
import type { DashboardMetric } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function CuratorReportsPage() {
  await requireRolePage(["curator"]);
  const data = await getCuratorReportData();

  return (
    <AppShell role="curator">
      <PageHeader
        title="Отчёты"
        description="Просмотр и экспорт статистики по вашим слушателям."
      />

      {data && data.total > 0 ? (
        <div className="space-y-6">
          <MetricGrid
            metrics={[
              { label: "Слушателей", value: data.total, tone: "primary", detail: `${data.withRisks} с рисками` },
              { label: "Завершили", value: data.completed, tone: "success" },
              { label: "В процессе", value: data.inProgress, tone: "info" },
              {
                label: "С рисками",
                value: data.withRisks,
                tone: data.withRisks > 0 ? "danger" : "success",
                priority: data.withRisks > 0 ? "elevated" : "normal",
              },
              {
                label: "Средний прогресс",
                value: `${data.avgProgress}%`,
                tone: data.avgProgress >= 70 ? "success" : data.avgProgress >= 40 ? "warning" : "danger",
              },
            ] satisfies DashboardMetric[]}
          />

          {/* Progress overview — M3 */}
          <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <CardHeader>
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Общий прогресс</CardTitle>
              <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Распределение слушателей по статусам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-m3-surface-variant mb-4">
                <div className="bg-m3-primary transition-all" style={{ width: `${(data.completed / data.total) * 100}%` }} />
                <div className="bg-m3-tertiary transition-all" style={{ width: `${(data.inProgress / data.total) * 100}%` }} />
                <div className="bg-m3-secondary transition-all" style={{ width: `${(data.notStarted / data.total) * 100}%` }} />
                <div className="bg-m3-error transition-all" style={{ width: `${(data.blocked / data.total) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-m3-primary mr-1" />{data.completed} завершили</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-m3-tertiary mr-1" />{data.inProgress} в процессе</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-m3-secondary mr-1" />{data.notStarted} не начали</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-m3-error mr-1" />{data.blocked} заблокированы</span>
              </div>
            </CardContent>
          </Card>

          {/* By course — M3 */}
          {data.courseBreakdown.length > 0 && (
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader>
                <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  items={data.courseBreakdown.map((c) => ({
                    label: c.course.length > 30 ? c.course.slice(0, 30) + "…" : c.course,
                    value: c.avg,
                    sublabel: `${c.completed}/${c.total} завершили`,
                    color: c.avg > 75 ? "#16a34a" : c.avg > 40 ? "#ca8a04" : "#dc2626",
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Download reports */}
          <DownloadReports reports={[
            {
              id: "curator_progress",
              title: "Прогресс слушателей",
              desc: "Успеваемость ваших слушателей",
              icon: "trending_up",
              owner: "Curator",
              scope: "Только закрепленные слушатели и потоки",
              decision: "Кому нужен контакт или поддержка в обучении.",
            },
            {
              id: "curator_risk",
              title: "Риски слушателей",
              desc: "Кто требует внимания",
              icon: "warning",
              owner: "Curator",
              scope: "Только закрепленные слушатели и потоки",
              decision: "Какие риски разобрать в первую очередь.",
            },
            {
              id: "assignments",
              title: "Задания",
              desc: "Работы закрепленных слушателей",
              icon: "checklist",
              owner: "Curator",
              scope: "Только закрепленные слушатели и потоки",
              decision: "Какие работы нужно проверить или вернуть на доработку.",
            },
            {
              id: "certificates",
              title: "Сертификаты",
              desc: "Сертификаты закрепленных слушателей",
              icon: "verified",
              owner: "Curator",
              scope: "Только закрепленные слушатели и потоки",
              decision: "Кто дошел до результата в зоне ответственности.",
            },
          ]} />
        </div>
      ) : (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="py-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <Icon name="bar_chart" className="text-[40px] text-m3-on-surface-variant/40" />
              <p className="font-body-md text-body-md text-m3-on-surface-variant">Нет данных для отображения.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
