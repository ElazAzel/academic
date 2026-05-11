import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRolePage } from "@/lib/auth/page-guards";
import { listAuditLogs } from "@/server/modules/audit/service";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
 await requireRolePage(["admin"]);
 const logs = await listAuditLogs();

 return (
  <AppShell role="admin">
   <PageHeader 
    title="Логи аудита" 
    description="История всех административных действий на платформе." 
  />

   <div className="mt-6">
    <Card className="rounded-3xl border-2 overflow-hidden">
     <CardContent className="p-0">
      <Table>
       <TableHeader className="bg-muted/50">
        <TableRow>
         <TableHead className="w-[180px]">Дата</TableHead>
         <TableHead>Действие</TableHead>
         <TableHead>Кто</TableHead>
         <TableHead>Объект</TableHead>
         <TableHead className="text-right">ID Объекта</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {logs.length > 0 ? logs.map((log) => (
         <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
           {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ru })}
          </TableCell>
          <TableCell className="font-medium text-sm">
           <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary"/>
            {log.action}
           </div>
          </TableCell>
          <TableCell className="text-sm">
           {log.actor ? (
            <div>
             <p>{log.actor.name || "Без имени"}</p>
             <p className="text-[10px] text-muted-foreground">{log.actor.email}</p>
            </div>
           ) : (
            <span className="text-muted-foreground">Система / Гость</span>
           )}
          </TableCell>
          <TableCell className="text-sm">
           <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold uppercase">
            {log.entity}
           </span>
          </TableCell>
          <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
           {log.entityId || "—"}
          </TableCell>
         </TableRow>
        )) : (
         <TableRow>
          <TableCell colSpan={5} className="py-20 text-center text-muted-foreground">
           Логов пока нет.
          </TableCell>
         </TableRow>
        )}
       </TableBody>
      </Table>
     </CardContent>
    </Card>
   </div>
  </AppShell>
 );
}
