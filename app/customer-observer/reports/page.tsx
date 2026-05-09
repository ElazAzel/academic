import { Download, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";

const REPORTS = [
  { id: "progress", title: "Прогресс по потокам", format: "CSV", updatedAt: "2026-05-06" },
  { id: "students", title: "Активность слушателей", format: "XLSX", updatedAt: "2026-05-06" },
  { id: "certificates", title: "Выданные сертификаты", format: "CSV", updatedAt: "2026-05-05" },
];

export default async function CustomerObserverReportsPage() {
  await requireRolePage(["customer_observer"]);

  return (
    <AppShell role="customer_observer">
      <PageHeader
        title="Отчеты проекта"
        description="Экспорт прогресса, активности и сертификации по доступным потокам."
        badge="Заказчик"
      />
      <div className="mt-6 space-y-3">
        {REPORTS.map((report) => (
          <Card key={report.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{report.title}</p>
                <p className="text-xs text-muted-foreground">Обновлен: {report.updatedAt}</p>
              </div>
              <Badge>{report.format}</Badge>
              <Button size="sm" variant="secondary">
                <Download className="h-4 w-4" />
                Скачать
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
