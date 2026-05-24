import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { PageSkeleton } from "@/components/lms/page-skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { getAdminDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const metadata = {
  title: "Дашборд — Администрирование",
  description: "Панель управления администратора.",
};


export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
 return (
  <AppShell role="admin">
   <PageHeader
    title="Дашборд администратора"
    description="Обзор всех систем, потоков и выданных сертификатов."
   />
   <Suspense fallback={<PageSkeleton />}>
    <AdminDashboardContent />
   </Suspense>
  </AppShell>
 );
}

async function AdminDashboardContent() {
 await requireRolePage(["admin"]);
 const data = await getAdminDashboard();
 const demoMode = isDemoModeEnabled();

 if (!data && !demoMode) {
  return <DashboardUnavailable />;
 }

 const metrics = data?.metrics ?? [];
 const courses = data?.courses ?? [];
 const cohorts = data?.cohorts ?? [];
 const certificates = data?.certificates ?? [];

 return (
  <div className="space-y-6">
   <MetricGrid metrics={metrics}/>

   <Tabs
    paramName="tab"
    tabs={[
     {
      label: `Курсы (${courses.length})`,
      content: (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
         <Card key={c.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardContent className="p-5">
           <p className="font-label-lg text-label-lg text-m3-on-surface line-clamp-1">{c.title}</p>
           <p className="font-body-sm text-body-sm text-m3-on-surface-variant pt-1">{c.modulesCount} модулей</p>
           <div className="mt-4 flex items-center justify-between">
            <Badge variant={c.status === "PUBLISHED" ? "default" : "secondary"}>
             {c.status}
            </Badge>
           </div>
          </CardContent>
         </Card>
        ))}
       </div>
      ),
     },
     {
      label: `Потоки (${cohorts.length})`,
      content: (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c) => (
         <Card key={c.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardContent className="p-5">
           <p className="font-label-lg text-label-lg text-m3-on-surface line-clamp-1">{c.name}</p>
           <p className="font-body-sm text-body-sm text-m3-on-surface-variant pt-1 flex items-center gap-1">
            <Icon name="group" className="text-[16px] text-m3-on-surface-variant" /> {c.studentsCount} слушателей
           </p>
           <div className="mt-4 flex items-center justify-between">
            <Badge variant={c.status === "active" ? "default" : "secondary"}>
             {c.status === "active" ? "Активен" : "Архив"}
            </Badge>
           </div>
          </CardContent>
         </Card>
        ))}
       </div>
      ),
     },
     {
      label: `Сертификаты (${certificates.length})`,
      content: (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((c) => (
         <Card key={c.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
          <CardContent className="p-5 space-y-1">
           <div className="flex items-center gap-2">
            <Icon name="verified" className="text-[20px] text-m3-primary" />
            <p className="font-label-lg text-label-lg text-m3-on-surface">{c.number}</p>
           </div>
           <p className="font-body-md text-body-md text-m3-on-surface pt-1">{c.studentName}</p>
           <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{c.courseTitle}</p>
          </CardContent>
         </Card>
        ))}
       </div>
      ),
     },
    ]}
   />
  </div>
 );
}
