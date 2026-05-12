import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomerObserverDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { listCertificates } from "@/server/modules/certificates/service";
import { getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";

export const dynamic = "force-dynamic";

export default async function CustomerObserverDashboardPage() {
 const user = await requireRolePage(["customer_observer"]);
 const data = await getCustomerObserverDashboard();
 const demoMode = isDemoModeEnabled();

 if (!data && !demoMode) {
  return (
   <AppShell role="customer_observer">
    <PageHeader title="Дашборд проекта" description="Прогресс, посещаемость, сертификаты и отчёты."/>
    <DashboardUnavailable/>
   </AppShell>
  );
 }

 const metrics = data?.metrics ?? [];
 const cohorts = data?.cohorts ?? [];
 const scopedIds = await getScopedStudentIdsForObserver(user.id);
 const certificates = await listCertificates(scopedIds ? { userIds: scopedIds } : undefined);

 return (
  <AppShell role="customer_observer">
   <PageHeader title="Дашборд проекта" description="Прогресс, посещаемость, сертификаты и отчёты."/>
   <div className="space-y-6">
    <MetricGrid metrics={metrics}/>
    <Card className="rounded-2xl">
     <CardHeader>
      <CardTitle className="text-base">Прогресс по потокам</CardTitle>
     </CardHeader>
     <CardContent className="space-y-4">
      {cohorts.length > 0 ? cohorts.map((c) => (
       <div key={c.id} className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
         <span>{c.name}</span>
         <span className="font-medium">{c.studentsCount} сл. · {c.avgProgress}%</span>
        </div>
        <Progress value={c.avgProgress}/>
       </div>
      )) : <p className="text-sm text-muted-foreground">Пока нет потоков для отчёта.</p>}
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
         {certificates.length > 0 ? certificates.map((cert) => (
          <TableRow key={cert.id}>
           <TableCell><code className="rounded bg-muted px-2 py-0.5 text-xs">{cert.number}</code></TableCell>
           <TableCell className="text-sm">{cert.user.name ?? cert.user.email}</TableCell>
           <TableCell className="text-sm text-muted-foreground">{cert.course.title}</TableCell>
           <TableCell className="text-xs text-muted-foreground">{new Date(cert.issuedAt).toLocaleDateString("ru-RU")}</TableCell>
          </TableRow>
         )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Сертификаты пока не выданы.</TableCell></TableRow>}
        </TableBody>
       </Table>
      ),
     },
     {
      label: "Отчёты",
      content: (
       <Card>
        <CardContent className="pt-6">
         <p className="text-sm text-muted-foreground text-center py-6">
          Для экспорта отчётов перейдите на страницу <a href="/customer-observer/reports" className="text-primary underline">Отчёты</a>.
         </p>
        </CardContent>
       </Card>
      ),
     },
    ]}/>
   </div>
  </AppShell>
 );
}
