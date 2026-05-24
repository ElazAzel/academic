import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { createQuizAction } from "@/server/actions/quiz-assignment";

export const metadata = {
  title: "Тесты — Инструктор",
  description: "Управление тестами курсов.",
};


export const dynamic = "force-dynamic";

export default async function InstructorQuizzesPage() {
 const user = await requireRolePage(["instructor", "admin"]);
 const prisma = getPrisma();

 const quizzes = await prisma.quiz.findMany({
  where: {
   course: { instructors: { some: { userId: user.id } } }
  },
  include: {
   course: true,
   lesson: true,
   _count: { select: { questions: true } }
  },
  orderBy: { createdAt: "desc" }
 });

 return (
  <AppShell role="instructor">
   <PageHeader title="Конструктор тестов" description="Создание тестов, вопросов, вариантов ответа и autograding."/>
   <div className="space-y-6 mt-6">
     <form action={createQuizAction}>
      <Button type="submit"><Plus className="h-4 w-4 mr-2"/>Создать тест</Button>
     </form>
    <div className="space-y-3">
     {quizzes.length > 0 ? (
      quizzes.map((q) => (
       <Card key={q.id} className="transition-shadow hover:shadow-sm">
        <CardContent className="flex items-center gap-4 py-4">
         <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <FileText className="h-5 w-5 text-primary"/>
         </span>
         <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{q.title}</p>
          <p className="text-xs text-muted-foreground">
           {q.course?.title} {q.lesson ? `· ${q.lesson.title}` : ""} · {q._count.questions} вопросов · порог {q.passThreshold}% · {q.maxAttempts} попытки
          </p>
         </div>
         <Button size="sm" variant="secondary" asChild>
          <Link href={`/instructor/quizzes/${q.id}/edit`}>Редактировать</Link>
         </Button>
        </CardContent>
       </Card>
      ))
      ) : (
       <EmptyState icon={FileText} title="Тестов пока нет" description="Создайте первый тест для вашего курса." />
      )}
    </div>
   </div>
  </AppShell>
 );
}
