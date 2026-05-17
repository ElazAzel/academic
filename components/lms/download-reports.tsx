import { Download, FileText, FileSpreadsheet, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReportType {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Override API type param if different from id. E.g. curator uses "curator_progress" */
  typeId?: string;
  /** Which formats are available. Default: ["csv", "xlsx", "pdf"] */
  formats?: ("csv" | "xlsx" | "pdf")[];
  owner?: string;
  scope?: string;
  decision?: string;
}

const FORMAT_META = {
  csv: { label: "CSV", icon: FileText },
  xlsx: { label: "Excel", icon: FileSpreadsheet },
  pdf: { label: "PDF", icon: FileText },
} as const;

/**
 * Блок скачивания отчётов — универсальный компонент для всех ролей.
 *
 * Пример:
 * ```tsx
 * <DownloadReports reports={[
 *   { id: "progress", title: "Прогресс", desc: "Все зачисления", icon: Users },
 *   { id: "certificates", title: "Сертификаты", desc: "Все сертификаты", icon: Award, formats: ["csv", "xlsx"] },
 * ]} />
 * ```
 */
export function DownloadReports({ reports }: { reports: ReportType[] }) {
  if (reports.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reports.map((r) => {
        const Icon = r.icon;
        const formats = r.formats ?? ["csv", "xlsx", "pdf"];
        return (
          <Card key={r.id} className="rounded-2xl transition-all hover:shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <Icon className="h-5 w-5 text-primary" />
                {r.owner ? <Badge variant="secondary" className="shrink-0 text-[10px]">{r.owner}</Badge> : null}
              </div>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(r.scope || r.decision) && (
                <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
                  {r.scope ? (
                    <p><span className="font-medium text-foreground">Scope:</span> <span className="text-muted-foreground">{r.scope}</span></p>
                  ) : null}
                  {r.decision ? (
                    <p><span className="font-medium text-foreground">Решение:</span> <span className="text-muted-foreground">{r.decision}</span></p>
                  ) : null}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {formats.map((fmt) => {
                  const meta = FORMAT_META[fmt];
                  const FmtIcon = meta.icon;
                  return (
                    <a
                      key={fmt}
                      href={`/api/v1/reports?type=${r.typeId ?? r.id}&format=${fmt}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30"
                      download
                    >
                      <FmtIcon className="h-3.5 w-3.5" />
                      {meta.label}
                      <Download className="h-3 w-3 ml-0.5 text-muted-foreground" />
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
