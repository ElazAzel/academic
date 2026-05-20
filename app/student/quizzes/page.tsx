import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { StatusBadge } from "@/components/lms/status-badge";
import { EmptyState } from "@/components/lms/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
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
       <CardContent className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
         Оценка: {attempt.score}% (Проходной: {attempt.quiz.passThreshold}%) · Дата: {new Date(attempt.startedAt).toLocaleDateString("ru-RU")}
        </span>
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
         <Link href={attempt.quiz.lesson?.id ? `/student/lessons/${attempt.quiz.lesson.id}` : `/student/quizzes/${attempt.quiz.id}/result`}>
          {attempt.quiz.lesson?.id ? "Открыть урок" : "Открыть результат"}
          <ArrowRight className="h-4 w-4" />
         </Link>
        </Button>
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
