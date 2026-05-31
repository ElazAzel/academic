import { VisitBarChart } from "@/components/charts/visit-bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getVisitAnalytics, getTimingAnalytics, type VisitAnalytics, type TimingAnalytics } from "@/server/actions/visit-analytics";
import { PerUserVisitTable } from "@/components/admin/per-user-visit-table";
import type { DashboardMetric } from "@/types/domain";

const SLOT_LABELS: Record<string, string> = {
  "0-3": "Ночь (0–3)",
  "3-6": "Раннее утро (3–6)",
  "6-9": "Утро (6–9)",
  "9-12": "День (9–12)",
  "12-15": "Полдень (12–15)",
  "15-18": "После обеда (15–18)",
  "18-21": "Вечер (18–21)",
  "21-24": "Поздний вечер (21–24)",
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} ч ${m} мин`;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <CardHeader className="pb-2">
        <CardTitle className="font-label-md text-label-md text-m3-on-surface-variant">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-display-md font-bold text-m3-on-surface">{value}</p>
        {detail && (
          <p className="font-body-sm text-body-sm text-m3-on-surface-variant mt-1">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export async function VisitAnalyticsBlock({
  days = 30,
  roleFilter,
}: {
  days?: number;
  roleFilter?: string;
}) {
  let visitData: VisitAnalytics | null = null;
  let timingData: TimingAnalytics | null = null;
  let loadError: string | null = null;

  try {
    const [vd, td] = await Promise.all([
      getVisitAnalytics(days, roleFilter),
      getTimingAnalytics(days),
    ]);
    visitData = vd;
    timingData = td;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("[VisitAnalyticsBlock] Failed to load analytics:", error);
  }

  if (loadError || !visitData || !timingData) {
    return (
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardContent className="py-10 text-center">
          <p className="font-label-lg text-label-lg text-m3-error mb-2">Не удалось загрузить данные посещаемости</p>
          <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
            {loadError ?? "Попробуйте обновить страницу"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics: DashboardMetric[] = [
    {
      label: "Всего сессий",
      value: visitData.summary.totalSessions,
      tone: visitData.summary.totalSessions > 0 ? "primary" : "neutral",
      detail: `За ${days} дней`,
    },
    {
      label: "Уникальных пользователей",
      value: visitData.summary.uniqueUsers,
      tone: "info",
      detail: `${visitData.byRole.length} ролей`,
    },
    {
      label: "Средняя длительность",
      value: formatDuration(visitData.summary.avgDurationSec),
      tone: "success",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} detail={m.detail as string} />
        ))}
      </div>

      {/* By role */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">По ролям</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitBarChart
            data={visitData.byRole.map((r) => ({
              label: r.role === "admin" ? "Администраторы"
                : r.role === "super_curator" ? "Супер-кураторы"
                : r.role === "curator" ? "Кураторы"
                : r.role === "instructor" ? "Преподаватели"
                : r.role === "student" ? "Студенты"
                : r.role === "customer_observer" ? "Наблюдатели"
                : r.role,
              value: r.sessions,
              sublabel: `${r.uniqueUsers} пользователей, средняя ${formatDuration(r.avgDurationSec)}`,
            }))}
          />
        </CardContent>
      </Card>

      {/* Hourly distribution */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Посещения по часам суток</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
            Распределение начала сессий по часам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisitBarChart
            data={visitData.hourlyDistribution.map((h) => ({
              label: HourLabel(h.hour),
              value: h.count,
              color: h.count > 0 ? "#2563eb" : "#e2e8f0",
            }))}
          />
        </CardContent>
      </Card>

      {/* Time slots */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Слоты времени</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
            Группировка по 3-часовым интервалам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisitBarChart
            data={visitData.timeSlotDistribution.map((s) => ({
              label: SLOT_LABELS[s.slot] ?? s.slot,
              value: s.count,
            }))}
          />
        </CardContent>
      </Card>

      {/* Daily visits */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Ежедневные визиты</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
            Количество сессий и уникальных пользователей по дням
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisitBarChart
            data={visitData.dailyVisits.map((d) => ({
              label: d.date,
              value: d.users,
              sublabel: `${d.sessions} сессий`,
              color: d.users > 0 ? "#16a34a" : "#e2e8f0",
            }))}
          />
        </CardContent>
      </Card>

      {/* Timing: messages + lessons + quizzes */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Активность по часам</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
            Сообщения, занятия и тесты по времени суток
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-label-md text-label-md text-m3-on-surface mb-3 flex items-center gap-2">
              <Icon name="chat" className="text-[18px]" /> Сообщения
            </h4>
            <VisitBarChart
              data={timingData.messagesByHour.map((m) => ({
                label: HourLabel(m.hour),
                value: m.student + m.curator,
                sublabel: `${m.student} студенты · ${m.curator} кураторы`,
              }))}
            />
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-m3-on-surface mb-3 flex items-center gap-2">
              <Icon name="school" className="text-[18px]" /> Занятия
            </h4>
            <VisitBarChart
              data={timingData.lessonsByHour.map((l) => ({
                label: HourLabel(l.hour),
                value: l.count,
              }))}
            />
          </div>
          <div>
            <h4 className="font-label-md text-label-md text-m3-on-surface mb-3 flex items-center gap-2">
              <Icon name="quiz" className="text-[18px]" /> Тесты
            </h4>
            <VisitBarChart
              data={timingData.quizzesByHour.map((q) => ({
                label: HourLabel(q.hour),
                value: q.count,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-user table */}
      <PerUserVisitTable days={days} roleFilter={roleFilter} />
    </div>
  );
}
