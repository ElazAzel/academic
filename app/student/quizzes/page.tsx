import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { StatusBadge } from "@/components/lms/status-badge";
import { EmptyState } from "@/components/lms/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getStudentQuizAttemptsAction } from "@/server/actions/student";

export const dynamic = "force-dynamic";

export default async function StudentQuizzesPage() {
 await requireRolePage(["student"]);
 const attempts = await getStudentQuizAttemptsAction();

 return (
  <AppShell role="student">
   <PageHeader title="Тесты" description="Список пройденных тестов."/>
   <div className="space-y-4 mt-6">
    {attempts.length > 0 ? (
     attempts.map((attempt) => (
      <Card key={attempt.id} className="rounded-2xl">
       <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
         <CardTitle className="text-base">{attempt.quiz.title}</CardTitle>
         <StatusBadge status={attempt.passed ? "passed" : "failed"} />
        </div>
        <CardDescription>{attempt.quiz.course?.title} {attempt.quiz.lesson ? `· ${attempt.quiz.lesson.title}` : ""}</CardDescription>
       </CardHeader>
       <CardContent className="text-sm">
        Оценка: {attempt.score}% (Проходной: {attempt.quiz.passThreshold}%) · Дата: {new Date(attempt.startedAt).toLocaleDateString("ru-RU")}
       </CardContent>
      </Card>
     ))
    ) : (
     <EmptyState icon={FileText} title="Вы ещё не проходили тестов" description="После прохождения теста в рамках урока он появится в этом списке." />
    )}
   </div>
  </AppShell>
 );
}
