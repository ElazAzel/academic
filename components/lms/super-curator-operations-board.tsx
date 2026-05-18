import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { RISK_LABELS } from "@/types/domain";
import type {
  RiskType,
  SuperCuratorCohortOperation,
  SuperCuratorProblemQuestion,
  SuperCuratorRiskQueueItem,
  SuperCuratorWorkload,
  SuperCuratorWorkloadLevel,
} from "@/types/domain";
import { cn } from "@/lib/utils";

const WORKLOAD_LABELS: Record<SuperCuratorWorkloadLevel, string> = {
  normal: "Норма",
  watch: "Наблюдать",
  overloaded: "Перегрузка",
  critical: "Критично",
};

const WORKLOAD_CLASSES: Record<SuperCuratorWorkloadLevel, string> = {
  normal: "bg-m3-primary-fixed/20 text-m3-on-primary-fixed border-m3-primary-fixed-dim/30",
  watch: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200",
  overloaded: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200",
  critical: "bg-m3-error-container/30 text-m3-error border-m3-error/30",
};

export function SuperCuratorOperationsBoard({
  curatorLoads,
  cohortOperations,
  problemQuestions,
  riskQueue,
}: {
  curatorLoads: SuperCuratorWorkload[];
  cohortOperations: SuperCuratorCohortOperation[];
  problemQuestions: SuperCuratorProblemQuestion[];
  riskQueue: SuperCuratorRiskQueueItem[];
}) {
  const overloadedCount = curatorLoads.filter((curator) => curator.workloadLevel === "critical" || curator.workloadLevel === "overloaded").length;
  const openQuestionsCount = problemQuestions.length;
  const hotRisksCount = riskQueue.length;

  return (
    <section className="space-y-6" aria-labelledby="super-curator-operations-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="super-curator-operations-title" className="text-m3-headline-sm text-m3-on-surface">
            Операционный контроль
          </h2>
          <p className="font-body-md text-body-md text-m3-on-surface-variant">
            Нагрузка кураторов, риски по потокам и вопросы, которые требуют вмешательства.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md", overloadedCount > 0 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-m3-primary-fixed/20 text-m3-on-primary-fixed")}>
            <Icon name="warning" className="text-[16px]" />
            {overloadedCount} перегрузок
          </span>
          <span className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md", openQuestionsCount > 0 ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" : "bg-m3-primary-fixed/20 text-m3-on-primary-fixed")}>
            <Icon name="forum" className="text-[16px]" />
            {openQuestionsCount} проблемных вопросов
          </span>
          <span className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md", hotRisksCount > 0 ? "bg-m3-error-container/30 text-m3-error" : "bg-m3-primary-fixed/20 text-m3-on-primary-fixed")}>
            <Icon name="error" className="text-[16px]" />
            {hotRisksCount} высоких рисков
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-m3-headline-sm text-m3-on-surface">
              <Icon name="group" className="text-[22px] text-m3-primary" />
              Нагрузка кураторов
            </CardTitle>
          </CardHeader>
          <CardContent>
            {curatorLoads.length === 0 ? (
              <EmptyState text="В зоне ответственности пока нет закрепленных кураторов." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {curatorLoads.map((curator) => (
                  <article
                    key={curator.curatorId}
                    className={cn(
                      "rounded-xl border p-4 transition-shadow hover:shadow-m3-soft bg-m3-surface-container-lowest",
                      curator.workloadLevel === "critical" && "border-m3-error/20 bg-m3-error-container/10",
                      curator.workloadLevel === "overloaded" && "border-amber-200 bg-amber-50/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-label-lg text-label-lg text-m3-on-surface">{curator.curatorName}</h3>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full font-label-md text-label-md border", WORKLOAD_CLASSES[curator.workloadLevel])}>
                            {WORKLOAD_LABELS[curator.workloadLevel]}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-body-sm text-body-sm text-m3-on-surface-variant">{curator.curatorEmail}</p>
                        <p className="mt-1 line-clamp-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                          {curator.cohorts.length > 0 ? curator.cohorts.join(" · ") : "поток не указан"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant={curator.workloadLevel === "normal" ? "secondary" : "primary"}>
                        <Link href={curator.nextActionHref}>{curator.nextActionLabel}</Link>
                      </Button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center font-body-sm text-body-sm">
                      <MetricCell value={curator.studentsCount} label="слуш." />
                      <MetricCell value={curator.openQuestions} label="вопросов" hot={curator.openQuestions > 0} />
                      <MetricCell value={curator.pendingReviews} label="работ" hot={curator.pendingReviews > 0} />
                      <MetricCell value={curator.activeRisks} label="рисков" hot={curator.activeRisks > 0} />
                      <MetricCell value={curator.unreadMessages} label="чат" hot={curator.unreadMessages > 0} />
                      <MetricCell value={curator.workloadScore} label="индекс" hot={curator.workloadScore > 30} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-m3-headline-sm text-m3-on-surface">
              <Icon name="help_center" className="text-[22px] text-m3-secondary" />
              Проблемные вопросы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {problemQuestions.length === 0 ? (
              <EmptyState text="Нет открытых вопросов в зоне контроля." />
            ) : (
              problemQuestions.map((question) => (
                <div key={question.id} className="rounded-xl border border-m3-outline-variant p-3 bg-m3-surface-container-low">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-m3-on-surface">{question.studentName}</p>
                      <p className="mt-1 line-clamp-2 font-body-sm text-body-sm text-m3-on-surface-variant">{question.text}</p>
                    </div>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full font-label-md text-label-md whitespace-nowrap shrink-0", question.ageHours >= 24 ? "bg-m3-error-container/30 text-m3-error" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300")}>
                      <Icon name="schedule" className="text-[14px] mr-1" />
                      {question.ageHours} ч
                    </span>
                  </div>
                  <p className="mt-2 font-body-sm text-body-sm text-m3-on-surface-variant">
                    {question.courseTitle} · {question.lessonTitle}
                  </p>
                  <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                    Куратор: {question.curatorName ?? "не назначен"}{question.cohortName ? ` · ${question.cohortName}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-m3-headline-sm text-m3-on-surface">
              <Icon name="shuffle" className="text-[22px] text-amber-600" />
              Потоки и зоны риска
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohortOperations.length === 0 ? (
              <EmptyState text="Нет потоков в зоне ответственности." />
            ) : (
              <div className="space-y-3">
                {cohortOperations.map((cohort) => (
                  <article key={cohort.cohortId} className="rounded-xl border border-m3-outline-variant p-4 bg-m3-surface-container-lowest">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-label-lg text-label-lg text-m3-on-surface">{cohort.cohortName}</h3>
                        <p className="mt-1 truncate font-body-sm text-body-sm text-m3-on-surface-variant">{cohort.courseTitle}</p>
                      </div>
                      <Button asChild size="sm" variant={cohort.criticalRisks > 0 || cohort.overloadedCurators > 0 ? "primary" : "secondary"}>
                        <Link href={cohort.nextActionHref}>{cohort.nextActionLabel}</Link>
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center font-body-sm text-body-sm md:grid-cols-6">
                      <MetricCell value={cohort.studentsCount} label="слуш." />
                      <MetricCell value={cohort.curatorCount} label="кур." />
                      <MetricCell value={`${cohort.avgProgress}%`} label="прогресс" />
                      <MetricCell value={cohort.openQuestions} label="вопросов" hot={cohort.openQuestions > 0} />
                      <MetricCell value={cohort.activeRisks} label="рисков" hot={cohort.activeRisks > 0} />
                      <MetricCell value={cohort.overloadedCurators} label="перегрузка" hot={cohort.overloadedCurators > 0} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-m3-headline-sm text-m3-on-surface">
              <Icon name="warning" className="text-[22px] text-m3-error" />
              Высокие риски
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskQueue.length === 0 ? (
              <EmptyState text="Нет высоких или критичных рисков." />
            ) : (
              riskQueue.map((risk) => (
                <div key={risk.id} className="rounded-xl border border-m3-outline-variant p-3 bg-m3-surface-container-low">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md text-m3-on-surface">{risk.studentName}</p>
                      <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                        {RISK_LABELS[risk.type as RiskType] ?? risk.type}
                      </p>
                    </div>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full font-label-md text-label-md", risk.severity === "critical" ? "bg-m3-error-container/30 text-m3-error" : "bg-m3-surface-container-high text-m3-on-surface-variant")}>
                      {risk.severity === "critical" && <Icon name="error" className="text-[14px] mr-1" />}
                      {risk.severity}
                    </span>
                  </div>
                  <p className="mt-2 font-body-sm text-body-sm text-m3-on-surface-variant">
                    {risk.courseTitle}{risk.cohortName ? ` · ${risk.cohortName}` : ""}
                  </p>
                  <p className="mt-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                    Куратор: {risk.curatorName ?? "не назначен"} · {risk.ageDays} дн.
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MetricCell({ value, label, hot = false }: { value: string | number; label: string; hot?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-m3-outline-variant bg-m3-surface-container-low px-2 py-2", hot && "border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200")}>
      <p className="font-label-lg text-label-lg text-m3-on-surface tabular-nums">{value}</p>
      <p className="font-label-md text-label-md text-m3-on-surface-variant">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-m3-outline-variant px-4 py-8 text-center font-body-md text-body-md text-m3-on-surface-variant">
      <Icon name="check_circle" className="mx-auto mb-2 h-6 w-6 opacity-50" />
      {text}
    </div>
  );
}
