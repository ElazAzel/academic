import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getCustomerObserverDashboard } from "@/server/actions/dashboard";
import { getObserverMetrics, MOCK_COHORTS, MOCK_CERTIFICATES } from "@/lib/mock-data";

export default async function CustomerObserverDashboardPage() {
  const data = await getCustomerObserverDashboard();

  const metrics = data?.metrics ?? getObserverMetrics();

  return (
    <AppShell role="customer_observer">
      <PageHeader title="Дашборд проекта" description="Прогресс, посещаемость, сертификаты и отчёты." badge="Заказчик" />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Прогресс по потокам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_COHORTS.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{c.studentsCount} сл.</span>
                </div>
                <Progress value={42} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Tabs tabs={[
          {
            label: "Сертификаты",
            content: (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Слушатель</TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CERTIFICATES.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell><code className="rounded bg-muted px-2 py-0.5 text-xs">{cert.number}</code></TableCell>
                      <TableCell className="text-sm">{cert.studentName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{cert.courseTitle}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(cert.issuedAt).toLocaleDateString("ru-RU")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ),
          },
          {
            label: "Отчёты",
            content: (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  {["Отчёт по курсу", "Отчёт по потоку", "Отчёт по слушателям", "Отчёт по сертификатам"].map((r) => (
                    <div key={r} className="flex items-center justify-between rounded-xl border p-3">
                      <span className="text-sm">{r}</span>
                      <Button size="sm" variant="secondary"><Download className="h-4 w-4" aria-hidden /> CSV</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ),
          },
        ]} />
      </div>
    </AppShell>
  );
}
