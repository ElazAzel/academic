import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, AlertTriangle } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";

const REPORTS = [
  {
    id: "curator_progress",
    title: "Прогресс слушателей",
    description: "Прогресс ваших закреплённых слушателей по курсам.",
    type: "curator_progress",
    format: "CSV",
    icon: Users,
  },
  {
    id: "curator_risk",
    title: "Риски слушателей",
    description: "Риски только по вашим слушателям.",
    type: "curator_risk",
    format: "CSV",
    icon: AlertTriangle,
  },
];

export default async function CuratorReportsPage() {
  await requireRolePage(["curator"]);

  return (
    <AppShell role="curator">
      <PageHeader title="Экспорт статистики" description="Скачать отчёты по вашим слушателям в CSV." />
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
              <CardContent className="flex items-center justify-between">
                <Badge>{r.format}</Badge>
                <Button asChild size="sm">
                  <Link href={`/api/v1/reports?type=${r.type}`}>
                    <Download className="h-4 w-4" />
                    Скачать
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
