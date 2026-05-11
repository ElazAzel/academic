import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUS_MAP = {
 DRAFT: { label: "Черновик", className: "bg-gray-100 text-gray-800" },
 SUBMITTED: { label: "Отправлено", className: "bg-blue-100 text-blue-800" },
 IN_REVIEW: { label: "На проверке", className: "bg-amber-100 text-amber-800" },
 ACCEPTED: { label: "Принято", className: "bg-emerald-100 text-emerald-800" },
 REJECTED: { label: "Отклонено", className: "bg-rose-100 text-rose-800" },
 NEEDS_REVISION: { label: "На доработку", className: "bg-orange-100 text-orange-800" }
};

export default async function StudentAssignmentsPage() {
 const user = await requireRolePage(["student"]);
 const prisma = getPrisma();

 const submissions = await prisma.assignmentSubmission.findMany({
  where: { userId: user.id },
  include: {
   assignment: { include: { course: true, lesson: true } }
  },
  orderBy: { submittedAt: "desc" }
 });

 return (
  <AppShell role="student">
   <PageHeader title="Задания" description="Список ваших отправленных заданий."/>
   <div className="space-y-4 mt-6">
    {submissions.length > 0 ? (
     submissions.map((sub) => {
      const status = STATUS_MAP[sub.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.SUBMITTED;
      return (
       <Card key={sub.id} className="rounded-2xl">
        <CardHeader className="pb-2">
         <div className="flex items-center justify-between">
          <CardTitle className="text-base">{sub.assignment.title}</CardTitle>
          <Badge className={`border-0 ${status.className}`}>{status.label}</Badge>
         </div>
         <CardDescription>{sub.assignment.course?.title} {sub.assignment.lesson ? `· ${sub.assignment.lesson.title}` : ""}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
         <p>Отправлено: {sub.submittedAt.toLocaleDateString("ru-RU")}</p>
         {sub.score !== null && <p>Оценка: {sub.score} / {sub.assignment.maxScore}</p>}
         {sub.feedback && (
          <div className="mt-2 p-3 bg-muted rounded-xl">
           <p className="font-medium text-xs mb-1">Комментарий куратора:</p>
           <p>{sub.feedback}</p>
          </div>
         )}
        </CardContent>
       </Card>
      );
     })
    ) : (
     <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-muted-foreground">
       У вас пока нет отправленных заданий.
      </CardContent>
     </Card>
    )}
   </div>
  </AppShell>
 );
}
