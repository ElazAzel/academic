import Link from "next/link";
import { AlertTriangle, ClipboardCheck, HelpCircle, Shuffle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-sky-200 bg-sky-50 text-sky-700",
  overloaded: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
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
          <h2 id="super-curator-operations-title" className="text-xl font-semibold">
            Операционный контроль
          </h2>
          <p className="text-sm text-muted-foreground">
            Нагрузка кураторов, риски по потокам и вопросы, которые требуют вмешательства.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={overloadedCount > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
            {overloadedCount} перегрузок
          </Badge>
          <Badge className={openQuestionsCount > 0 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
            {openQuestionsCount} проблемных вопросов
          </Badge>
          <Badge className={hotRisksCount > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
            {hotRisksCount} высоких рисков
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
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
                      "rounded-2xl border p-4 transition-shadow hover:shadow-sm",
                      curator.workloadLevel === "critical" && "border-rose-200 bg-rose-50/30",
                      curator.workloadLevel === "overloaded" && "border-amber-200 bg-amber-50/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{curator.curatorName}</h3>
                          <Badge className={WORKLOAD_CLASSES[curator.workloadLevel]}>
                            {WORKLOAD_LABELS[curator.workloadLevel]}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{curator.curatorEmail}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {curator.cohorts.length > 0 ? curator.cohorts.join(" · ") : "поток не указан"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant={curator.workloadLevel === "normal" ? "secondary" : "primary"}>
                        <Link href={curator.nextActionHref}>{curator.nextActionLabel}</Link>
                      </Button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
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

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-sky-600" />
              Проблемные вопросы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {problemQuestions.length === 0 ? (
              <EmptyState text="Нет открытых вопросов в зоне контроля." />
            ) : (
              problemQuestions.map((question) => (
                <div key={question.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{question.studentName}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.text}</p>
                    </div>
                    <Badge className={question.ageHours >= 24 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {question.ageHours} ч
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {question.courseTitle} · {question.lessonTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Куратор: {question.curatorName ?? "не назначен"}{question.cohortName ? ` · ${question.cohortName}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shuffle className="h-5 w-5 text-amber-600" />
              Потоки и зоны риска
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohortOperations.length === 0 ? (
              <EmptyState text="Нет потоков в зоне ответственности." />
            ) : (
              <div className="space-y-3">
                {cohortOperations.map((cohort) => (
                  <article key={cohort.cohortId} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{cohort.cohortName}</h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{cohort.courseTitle}</p>
                      </div>
                      <Button asChild size="sm" variant={cohort.criticalRisks > 0 || cohort.overloadedCurators > 0 ? "primary" : "secondary"}>
                        <Link href={cohort.nextActionHref}>{cohort.nextActionLabel}</Link>
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs md:grid-cols-6">
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

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Высокие риски
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskQueue.length === 0 ? (
              <EmptyState text="Нет высоких или критичных рисков." />
            ) : (
              riskQueue.map((risk) => (
                <div key={risk.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{risk.studentName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {RISK_LABELS[risk.type as RiskType] ?? risk.type}
                      </p>
                    </div>
                    <Badge variant={risk.severity === "critical" ? "destructive" : "outline"}>
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {risk.courseTitle}{risk.cohortName ? ` · ${risk.cohortName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
    <div className={cn("rounded-xl border bg-muted/40 px-2 py-2", hot && "border-amber-200 bg-amber-50 text-amber-800")}>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      <ClipboardCheck className="mx-auto mb-2 h-6 w-6 opacity-50" />
      {text}
    </div>
  );
}
