"use client";

import { useState, useCallback } from "react";
import { Download, FileText, FileSpreadsheet, Table2, Settings2, X, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReportTypeId = "progress" | "risk" | "assignments" | "certificates" | "curator_workload" | "productivity_score" | "weekly_cohort" | "final_cohort";
type FormatId = "csv" | "xlsx" | "pdf";

interface ColumnDef {
  key: string;
  label: string;
  defaultOn: boolean;
}

interface ReportTypeDef {
  id: ReportTypeId;
  title: string;
  desc: string;
  columns: ColumnDef[];
}

const REPORT_TYPES: ReportTypeDef[] = [
  {
    id: "progress",
    title: "Прогресс слушателей",
    desc: "Зачисления, прогресс, модули, уроки",
    columns: [
      { key: "studentName", label: "Слушатель", defaultOn: true },
      { key: "email", label: "Email", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "cohort", label: "Поток", defaultOn: true },
      { key: "progressPercent", label: "Прогресс %", defaultOn: true },
      { key: "currentModule", label: "Модуль", defaultOn: true },
      { key: "currentBlock", label: "Блок", defaultOn: true },
      { key: "currentLesson", label: "Урок", defaultOn: true },
      { key: "lastLoginAt", label: "Последний вход", defaultOn: false },
      { key: "avgLessonMinutes", label: "Ср. мин/урок", defaultOn: false },
      { key: "riskCount", label: "Риски", defaultOn: true },
    ],
  },
  {
    id: "risk",
    title: "Риски слушателей",
    desc: "Неактивные, просроченные, отстающие",
    columns: [
      { key: "studentName", label: "Слушатель", defaultOn: true },
      { key: "email", label: "Email", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "type", label: "Тип риска", defaultOn: true },
      { key: "severity", label: "Уровень", defaultOn: true },
      { key: "status", label: "Статус", defaultOn: true },
    ],
  },
  {
    id: "certificates",
    title: "Сертификаты",
    desc: "Все выпущенные сертификаты",
    columns: [
      { key: "number", label: "Номер", defaultOn: true },
      { key: "studentName", label: "Слушатель", defaultOn: true },
      { key: "email", label: "Email", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "issuedAt", label: "Дата выдачи", defaultOn: true },
      { key: "status", label: "Статус", defaultOn: true },
      { key: "revokedAt", label: "Дата отзыва", defaultOn: true },
    ],
  },
  {
    id: "assignments",
    title: "Задания",
    desc: "Отправки, статусы проверки, баллы",
    columns: [
      { key: "studentName", label: "Слушатель", defaultOn: true },
      { key: "email", label: "Email", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "lesson", label: "Урок", defaultOn: false },
      { key: "assignment", label: "Задание", defaultOn: true },
      { key: "status", label: "Статус", defaultOn: true },
      { key: "score", label: "Балл", defaultOn: true },
      { key: "submittedAt", label: "Отправлено", defaultOn: true },
      { key: "reviewedAt", label: "Проверено", defaultOn: false },
      { key: "reviewerName", label: "Проверяющий", defaultOn: false },
    ],
  },
  {
    id: "curator_workload",
    title: "Нагрузка кураторов",
    desc: "Очереди, риски, прогресс по зоне ответственности",
    columns: [
      { key: "curatorName", label: "Куратор", defaultOn: true },
      { key: "curatorEmail", label: "Email", defaultOn: true },
      { key: "cohorts", label: "Потоки", defaultOn: true },
      { key: "studentsCount", label: "Слушателей", defaultOn: true },
      { key: "avgProgress", label: "Средний прогресс", defaultOn: true },
      { key: "openQuestions", label: "Вопросы", defaultOn: true },
      { key: "pendingAssignments", label: "Задания", defaultOn: true },
      { key: "activeRisks", label: "Риски", defaultOn: true },
      { key: "criticalRisks", label: "Критические", defaultOn: true },
    ],
  },
  {
    id: "productivity_score",
    title: "Productivity Score",
    desc: "Комплексная оценка продуктивности",
    columns: [
      { key: "studentName", label: "Слушатель", defaultOn: true },
      { key: "email", label: "Email", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "cohort", label: "Поток", defaultOn: true },
      { key: "totalScore", label: "Общий балл", defaultOn: true },
      { key: "level", label: "Уровень", defaultOn: true },
      { key: "testsScore", label: "Тесты", defaultOn: true },
      { key: "assignmentsScore", label: "Задания", defaultOn: true },
      { key: "finalProjectScore", label: "Фин. работа", defaultOn: true },
      { key: "activityScore", label: "Активность", defaultOn: true },
      { key: "diagnosticsScore", label: "Диагностика", defaultOn: false },
    ],
  },
  {
    id: "weekly_cohort",
    title: "Еженедельный отчёт по потоку",
    desc: "Сводка за неделю: активность, риски, вопросы, прогресс",
    columns: [
      { key: "cohortName", label: "Поток", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "totalStudents", label: "Всего слушателей", defaultOn: true },
      { key: "activeStudents", label: "Активных", defaultOn: true },
      { key: "activePercent", label: "Активность %", defaultOn: true },
      { key: "moduleProgressPercent", label: "Прогресс %", defaultOn: true },
      { key: "completedWeekCount", label: "Завершили неделю", defaultOn: true },
      { key: "behindCount", label: "Отстающих", defaultOn: true },
      { key: "criticalRisks", label: "Крит. риски", defaultOn: true },
      { key: "totalQuestions", label: "Вопросов", defaultOn: true },
      { key: "avgResponseTimeHours", label: "Ср. время ответа (ч)", defaultOn: false },
      { key: "submittedAssignments", label: "Сданных заданий", defaultOn: true },
      { key: "avgAssignmentScore", label: "Ср. оценка", defaultOn: false },
      { key: "currentModule", label: "Текущий модуль", defaultOn: false },
    ],
  },
  {
    id: "final_cohort",
    title: "Итоговый отчёт по потоку",
    desc: "Итоговые метрики, Score, сертификаты, риски",
    columns: [
      { key: "cohortName", label: "Поток", defaultOn: true },
      { key: "course", label: "Курс", defaultOn: true },
      { key: "totalEnrolled", label: "Зачислено", defaultOn: true },
      { key: "completedCount", label: "Завершили", defaultOn: true },
      { key: "completedPercent", label: "Завершили %", defaultOn: true },
      { key: "finalProjectSubmitted", label: "Фин.работа сдана", defaultOn: true },
      { key: "certificatesIssued", label: "Сертификатов", defaultOn: true },
      { key: "avgProductivityScore", label: "Score (avg)", defaultOn: true },
      { key: "avgTestScore", label: "Тесты (avg)", defaultOn: true },
      { key: "avgAssignmentScore", label: "Задания (avg)", defaultOn: true },
      { key: "avgFinalProjectScore", label: "Фин.работа (avg)", defaultOn: false },
      { key: "satisfactionScore", label: "Satisfaction", defaultOn: false },
      { key: "nps", label: "NPS", defaultOn: false },
    ],
  },
];

const FORMATS: { id: FormatId; label: string; icon: typeof FileText }[] = [
  { id: "csv", label: "CSV", icon: FileText },
  { id: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF", icon: FileText },
];

const ALLOWED_ROLES_MAP: Record<ReportTypeId, string[]> = {
  progress: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  risk: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  certificates: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  assignments: ["admin", "instructor", "curator", "super_curator"],
  curator_workload: ["admin", "super_curator"],
  productivity_score: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  weekly_cohort: ["admin", "super_curator", "curator", "customer_observer"],
  final_cohort: ["admin", "super_curator", "curator", "customer_observer"],
};

const REPORT_PREVIEW_ERROR = "Не удалось загрузить предварительный просмотр";

class ReportDesignerUserError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readReportPreviewError(payload: unknown) {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return REPORT_PREVIEW_ERROR;
}

function readReportPreviewData(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new ReportDesignerUserError(REPORT_PREVIEW_ERROR);
  }

  const { data } = payload;
  if (!Array.isArray(data.previewRows) || typeof data.totalRowsCount !== "number") {
    throw new ReportDesignerUserError(REPORT_PREVIEW_ERROR);
  }

  return {
    previewRows: data.previewRows.filter(isRecord),
    totalRowsCount: data.totalRowsCount,
    isTruncated: Boolean(data.isTruncated),
    rowLimit: typeof data.rowLimit === "number" ? data.rowLimit : null,
  };
}

function getReportDesignerErrorMessage(error: unknown) {
  return error instanceof ReportDesignerUserError ? error.message : REPORT_PREVIEW_ERROR;
}

export function ReportDesigner({
  defaultType = "progress",
  userRoles = ["admin"]
}: {
  defaultType?: ReportTypeDef["id"];
  userRoles?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<FormatId>("xlsx");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [totalRowsCount, setTotalRowsCount] = useState<number | null>(null);
  const [previewIsTruncated, setPreviewIsTruncated] = useState(false);
  const [previewRowLimit, setPreviewRowLimit] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const allowedReportDefs = REPORT_TYPES.filter((t) =>
    userRoles.some((role) => ALLOWED_ROLES_MAP[t.id]?.includes(role))
  );

  const initialType = allowedReportDefs.some((t) => t.id === defaultType)
    ? defaultType
    : (allowedReportDefs[0]?.id || "progress");

  const [reportType, setReportType] = useState<ReportTypeDef["id"]>(initialType);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    setShowPreview(true);
    try {
      const res = await fetch(`/api/v1/reports/preview?type=${reportType}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ReportDesignerUserError(readReportPreviewError(payload));
      }
      const data = readReportPreviewData(payload);
      setPreviewRows(data.previewRows);
      setTotalRowsCount(data.totalRowsCount);
      setPreviewIsTruncated(data.isTruncated);
      setPreviewRowLimit(data.rowLimit);
    } catch (err) {
      setPreviewError(getReportDesignerErrorMessage(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  const currentType = allowedReportDefs.find((t) => t.id === reportType) ?? allowedReportDefs[0] ?? REPORT_TYPES[0];

  if (allowedReportDefs.length === 0) {
    return null;
  }

  function openDesigner() {
    setSelectedColumns(new Set(currentType.columns.filter((c) => c.defaultOn).map((c) => c.key)));
    setIsOpen(true);
  }

  function toggleColumn(key: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelectedColumns(new Set(currentType.columns.map((c) => c.key)));
  }

  function deselectAll() {
    setSelectedColumns(new Set<string>());
  }

  const downloadUrl = `/api/v1/reports?type=${reportType}&format=${format}&fields=${Array.from(selectedColumns).join(",")}`;

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={openDesigner} className="gap-2">
        <Settings2 className="h-4 w-4" />
        Настроить отчёт
      </Button>
    );
  }

  return (
    <Card className="rounded-lg border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            Конструктор отчётов
          </CardTitle>
          <CardDescription>Выберите тип, колонки и формат</CardDescription>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Тип отчёта</span>
          <div className="flex flex-wrap gap-2">
            {allowedReportDefs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setReportType(t.id);
                  setSelectedColumns(new Set(t.columns.filter((c) => c.defaultOn).map((c) => c.key)));
                  setShowPreview(false);
                  setPreviewRows([]);
                  setTotalRowsCount(null);
                  setPreviewIsTruncated(false);
                  setPreviewRowLimit(null);
                }}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-all text-left",
                  reportType === t.id
                    ? "border-m3-primary bg-m3-primary/5 text-m3-primary ring-1 ring-m3-primary"
                    : "border-m3-outline-variant text-m3-on-surface-variant hover:border-m3-primary/30 hover:bg-m3-surface-container-high/40"
                )}
              >
                <p>{t.title}</p>
                <p className="text-[10px] text-m3-on-surface-variant font-normal mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Колонки ({selectedColumns.size})</label>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-primary hover:underline">Все</button>
              <button onClick={deselectAll} className="text-muted-foreground hover:underline">Сбросить</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentType.columns.map((col) => {
              const isSelected = selectedColumns.has(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all",
                    isSelected
                      ? "border-m3-primary/40 bg-m3-primary/5 text-m3-primary"
                      : "border-m3-outline-variant text-m3-on-surface-variant hover:border-m3-on-surface-variant/30 hover:bg-m3-surface-container-high/40"
                  )}
                >
                  {isSelected ? <Check className="h-3 w-3" /> : null}
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Формат</span>
          <div className="flex gap-2">
            {FORMATS.map((f) => {
              const FmtIcon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                    format === f.id
                      ? "border-m3-primary bg-m3-primary/5 text-m3-primary ring-1 ring-m3-primary"
                      : "border-m3-outline-variant text-m3-on-surface-variant hover:border-m3-primary/30 hover:bg-m3-surface-container-high/40"
                  )}
                >
                  <FmtIcon className="h-4 w-4" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {showPreview && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">
                  Предварительный просмотр (первые 5 строк)
                </span>
                {totalRowsCount !== null && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {previewIsTruncated && previewRowLimit !== null
                      ? `Показано строк: ${totalRowsCount} из лимита ${previewRowLimit}`
                      : `Всего строк: ${totalRowsCount}`}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
              >
                <EyeOff className="h-3 w-3" />
                Скрыть
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Загрузка данных из базы...</span>
              </div>
            ) : previewError ? (
              <div className="rounded-lg bg-m3-error-container/10 p-4 text-xs text-m3-error border border-m3-error/20">
                {previewError}
              </div>
            ) : previewRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-m3-on-surface-variant">
                Нет данных для отображения.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest shadow-inner max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-m3-surface-container-low border-b border-m3-outline-variant sticky top-0">
                      {currentType.columns.map((col) => {
                        if (!selectedColumns.has(col.key)) return null;
                        return (
                          <th key={col.key} className="p-2.5 font-semibold text-m3-on-surface">
                            {col.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-m3-outline-variant last:border-0 hover:bg-m3-surface-container-high/20 transition-colors">
                        {currentType.columns.map((col) => {
                          if (!selectedColumns.has(col.key)) return null;
                          const rawVal = row[col.key];
                          const displayVal =
                            rawVal === undefined || rawVal === null ? "—" :
                            typeof rawVal === "boolean" ? (rawVal ? "Да" : "Нет") :
                            String(rawVal);
                          return (
                            <td key={col.key} className="p-2.5 text-m3-on-surface-variant font-medium">
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {selectedColumns.size} колонок · формат {format.toUpperCase()}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={selectedColumns.size === 0 || loadingPreview}
              onClick={fetchPreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              Показать превью
            </Button>
            {selectedColumns.size === 0 || generating ? (
              <Button disabled>
                <Download className="h-4 w-4 mr-2" />
                {generating ? "Генерация..." : "Скачать"}
              </Button>
            ) : (
              <Button asChild>
                <a
                  href={downloadUrl}
                  download
                  onClick={() => {
                    setGenerating(true);
                    setTimeout(() => setGenerating(false), 3000);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Скачать
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
