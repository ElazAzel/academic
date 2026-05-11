import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Users, AlertTriangle, FileSpreadsheet, FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";

const FORMATS = [
  { id: "csv", label: "CSV", icon: FileText },
  { id: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF", icon: FileText },
] as const;

const REPORTS = [
  {
    id: "curator_progress",
    title: "Прогресс слушателей",
    description: "Прогресс ваших закреплённых слушателей по курсам с группировкой и диаграммами.",
    type: "curator_progress",
    icon: Users,
    formats: ["csv", "xlsx", "pdf"],
  },
  {
    id: "curator_risk",
    title: "Риски слушателей",
    description: "Риски только по вашим слушателям с цветовой индикацией уровней.",
    type: "curator_risk",
    icon: AlertTriangle,
    formats: ["csv", "xlsx", "pdf"],
  },
];

export default async function CuratorReportsPage() {
  await requireRolePage(["curator"]);

  return (
    <AppShell role="curator">
      <PageHeader title="Экспорт статистики" description="Скачать отчёты по вашим слушателям в CSV, Excel или PDF." />
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <CardTitle>{r.title}</CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.filter((f) => r.formats.includes(f.id)).map((fmt) => {
                    const FmtIcon = fmt.icon;
                    return (
                      <Link
                        key={fmt.id}
                        href={`/api/v1/reports?type=${r.type}&format=${fmt.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30"
                      >
                        <FmtIcon className="h-3.5 w-3.5" />
                        {fmt.label}
                        <Download className="h-3 w-3 ml-0.5 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}