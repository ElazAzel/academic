import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";

const REPORTS = [
  { id: "r1", title: "Еженедельный отчёт по кураторам", type: "weekly", lastGenerated: "2026-05-05", format: "CSV" },
  { id: "r2", title: "Отчёт по рискам слушателей", type: "risk", lastGenerated: "2026-05-06", format: "XLSX" },
  { id: "r3", title: "SLA ответов кураторов", type: "sla", lastGenerated: "2026-05-04", format: "PDF" },
  { id: "r4", title: "Прогресс по потокам", type: "progress", lastGenerated: "2026-05-06", format: "CSV" },
];

export default async function SuperCuratorReportsPage() {
  await requireRolePage(["super_curator"]);

  return (
    <AppShell role="super_curator">
      <PageHeader title="Отчёты" description="Регулярные и ad-hoc отчёты для супер-куратора." badge="Супер-куратор" />
      <div className="space-y-3">
        {REPORTS.map((r) => (
          <Card key={r.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">Последний: {r.lastGenerated}</p>
              </div>
              <Badge>{r.format}</Badge>
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
