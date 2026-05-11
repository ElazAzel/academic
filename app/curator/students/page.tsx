import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { getCuratorStudents } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function CuratorStudentsPage() {
 await requireRolePage(["curator", "super_curator"]);
 const students = await getCuratorStudents();

 return (
  <AppShell role="curator">
   <PageHeader title="Мои слушатели" description="Полный список ваших слушателей с прогрессом и статусом."/>
   <div className="mt-6 border rounded-2xl bg-white overflow-hidden">
    <Table>
     <TableHeader>
      <TableRow>
       <TableHead>Слушатель</TableHead>
       <TableHead>Курс</TableHead>
       <TableHead>Прогресс</TableHead>
       <TableHead>Статус</TableHead>
      </TableRow>
     </TableHeader>
     <TableBody>
      {students.length > 0 ? (
       students.map((s) => (
        <TableRow key={s.id}>
         <TableCell>
          <div className="flex items-center gap-2">
           <Avatar name={s.name} className="h-7 w-7 text-[10px]"/>
           <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.email}</p>
           </div>
          </div>
         </TableCell>
         <TableCell className="text-sm text-muted-foreground">{s.course}</TableCell>
         <TableCell>
          <div className="flex items-center gap-2 min-w-[120px]">
           <Progress value={s.progress} className="h-1.5 flex-1"/>
           <span className="text-xs font-medium w-8 text-right">{s.progress}%</span>
          </div>
         </TableCell>
         <TableCell>
          {s.risk ? (
           <Badge className="border-rose-200 bg-rose-50 text-rose-700">Риск</Badge>
          ) : s.progress >= 80 ? (
           <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Отлично</Badge>
          ) : (
           <Badge className="border-sky-200 bg-sky-50 text-sky-700">Активен</Badge>
          )}
         </TableCell>
        </TableRow>
       ))
      ) : (
       <TableRow>
        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
         У вас пока нет назначенных слушателей.
        </TableCell>
       </TableRow>
      )}
     </TableBody>
    </Table>
   </div>
  </AppShell>
 );
}
