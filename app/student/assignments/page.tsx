import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import { EmptyState } from "@/components/lms/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getStudentAssignmentSubmissionsAction } from "@/server/actions/student";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
 await requireRolePage(["student"]);
 const submissions = await getStudentAssignmentSubmissionsAction();

 return (
  <AppShell role="student">
   <PageHeader title="Задания" description="Список ваших отправленных заданий."/>
   <div className="space-y-4 mt-6">
    {submissions.length > 0 ? (
     submissions.map((sub) => (
      <Card key={sub.id} className="rounded-2xl">
       <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
         <CardTitle className="text-base">{sub.assignment.title}</CardTitle>
         <StatusBadge status={sub.status as BadgeStatus} />
        </div>
        <CardDescription>{sub.assignment.course?.title} {sub.assignment.lesson ? `· ${sub.assignment.lesson.title}` : ""}</CardDescription>
       </CardHeader>
       <CardContent className="space-y-3 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <p>Отправлено: {sub.submittedAt.toLocaleDateString("ru-RU")}</p>
         <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href={sub.assignment.lesson?.id ? `/student/lessons/${sub.assignment.lesson.id}` : `/student/assignments/${sub.assignment.id}`}>
           {sub.assignment.lesson?.id ? "Открыть урок" : "Открыть задание"}
           <ArrowRight className="h-4 w-4" />
          </Link>
         </Button>
        </div>
        {sub.score !== null && <p>Оценка: {sub.score} / {sub.assignment.maxScore}</p>}
        {sub.feedback && (
         <div className="mt-2 p-3 bg-muted rounded-xl">
          <p className="font-medium text-xs mb-1">Комментарий куратора:</p>
          <p>{sub.feedback}</p>
         </div>
        )}
       </CardContent>
      </Card>
     ))
    ) : (
     <EmptyState icon={FileText} title="У вас пока нет отправленных заданий" description="После отправки задания в рамках урока оно появится в этом списке." />
    )}
   </div>
  </AppShell>
 );
}
