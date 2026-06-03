import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

interface ReportType {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** Override API type param if different from id. E.g. curator uses "curator_progress" */
  typeId?: string;
  /** Which formats are available. Default: ["csv", "xlsx", "pdf"] */
  formats?: ("csv" | "xlsx" | "pdf")[];
  owner?: string;
  scope?: string;
  decision?: string;
}

const FORMAT_META = {
  csv: { label: "CSV", icon: "description" },
  xlsx: { label: "Excel", icon: "table_chart" },
  pdf: { label: "PDF", icon: "picture_as_pdf" },
} as const;

/**
 * Блок скачивания отчётов — универсальный компонент для всех ролей.
 *
 * Пример:
 * ```tsx
 * <DownloadReports reports={[
 *   { id: "progress", title: "Прогресс", desc: "Все зачисления", icon: "group" },
 *   { id: "certificates", title: "Сертификаты", desc: "Все сертификаты", icon: "verified", formats: ["csv", "xlsx"] },
 * ]} />
 * ```
 */
export function DownloadReports({ reports }: { reports: ReportType[] }) {
  if (reports.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((r) => {
        const formats = r.formats ?? ["csv", "xlsx", "pdf"];
        return (
          <Card key={r.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-m3-primary-container/20">
                  <Icon name={r.icon} className="text-[22px] text-m3-primary" />
                </span>
                {r.owner ? <Badge variant="secondary" className="shrink-0 text-[10px]">{r.owner}</Badge> : null}
              </div>
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface mt-2">{r.title}</CardTitle>
              <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">{r.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(r.scope || r.decision) && (
                <div className="space-y-1 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-3">
                  {r.scope ? (
                    <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
                      <span className="font-label-md text-label-md text-m3-on-surface">Область:</span> {r.scope}
                    </p>
                  ) : null}
                  {r.decision ? (
                    <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
                      <span className="font-label-md text-label-md text-m3-on-surface">Решение:</span> {r.decision}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {formats.map((fmt) => {
                  const meta = FORMAT_META[fmt];
                  return (
                    <a
                      key={fmt}
                      href={`/api/v1/reports?type=${r.typeId ?? r.id}&format=${fmt}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30"
                      download
                    >
                      <Icon name={meta.icon} className="text-[16px]" />
                      {meta.label}
                      <Icon name="download" className="text-[14px] text-m3-on-surface-variant ml-0.5" />
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
