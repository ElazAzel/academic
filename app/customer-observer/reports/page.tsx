import Link from "next/link";
import { Download, Users, AlertTriangle, Award } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";

const REPORTS = [
 { id: "progress", title: "Прогресс по потокам", description: "Все зачисления и прогресс по потокам.", type: "progress", format: "CSV", icon: Users },
 { id: "risk", title: "Риски слушателей", description: "Неактивные и отстающие слушатели.", type: "risk", format: "CSV", icon: AlertTriangle },
 { id: "certificates", title: "Выданные сертификаты", description: "Все выпущенные сертификаты.", type: "certificates", format: "CSV", icon: Award },
];

export default async function CustomerObserverReportsPage() {
 await requireRolePage(["customer_observer"]);

 return (
  <AppShell role="customer_observer">
   <PageHeader title="Экспорт статистики" description="Скачать отчёты по доступным потокам в CSV."/>
   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {REPORTS.map((r) => {
     const Icon = r.icon;
     return (
      <Card key={r.id} className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
       <CardHeader>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
         <Icon className="h-5 w-5 text-primary"/>
        </span>
        <CardTitle>{r.title}</CardTitle>
        <CardDescription>{r.description}</CardDescription>
       </CardHeader>
       <CardContent className="flex items-center justify-between">
        <Badge>{r.format}</Badge>
        <Button asChild size="sm">
         <Link href={`/api/v1/reports?type=${r.type}`}>
          <Download className="h-4 w-4"/>
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
