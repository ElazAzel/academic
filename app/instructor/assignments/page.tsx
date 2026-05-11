import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InstructorAssignmentsPage() {
 const user = await requireRolePage(["instructor", "admin"]);
 const prisma = getPrisma();

 const assignments = await prisma.assignment.findMany({
  where: {
   course: { instructors: { some: { userId: user.id } } }
  },
  include: {
   course: true,
   lesson: true,
   _count: { select: { submissions: { where: { status: "SUBMITTED" } } } }
  },
  orderBy: { createdAt: "desc" }
 });

 return (
  <AppShell role="instructor">
   <PageHeader title="Конструктор заданий" description="Инструкции, дедлайны, критерии и проверка попыток."/>
   <div className="space-y-6 mt-6">
    <Button><Plus className="h-4 w-4 mr-2"/>Создать задание</Button>
    <div className="space-y-3">
     {assignments.length > 0 ? (
      assignments.map((a) => (
       <Card key={a.id} className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 py-4">
         <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
          <FileText className="h-5 w-5 text-amber-600"/>
         </span>
         <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{a.title}</p>
          <p className="text-xs text-muted-foreground">
           {a.course?.title} {a.lesson ? `· ${a.lesson.title}` : ""} · макс. {a.maxAttempts} попытки · макс. балл {a.maxScore}
          </p>
         </div>
         {a._count.submissions > 0 && (
          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
           {a._count.submissions} на проверку
          </Badge>
         )}
         <Button size="sm" variant="secondary" asChild>
          <Link href={`/instructor/assignments/${a.id}/edit`}>Редактировать</Link>
         </Button>
        </CardContent>
       </Card>
      ))
     ) : (
      <div className="text-center text-muted-foreground py-10 border rounded-2xl">У вас пока нет заданий.</div>
     )}
    </div>
   </div>
  </AppShell>
 );
}
