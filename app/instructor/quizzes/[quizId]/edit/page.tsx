import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getInstructorQuizEditData } from "@/server/modules/page-data/service";
import { QuizEditForm } from "@/components/instructor/quiz-edit-form";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Редактирование теста — Инструктор",
  description: "Редактирование теста и вопросов.",
};


export const dynamic = "force-dynamic";

export default async function InstructorEditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
 await requireRolePage(["instructor", "admin"]);
 const { quizId } = await params;

  const quiz = await getInstructorQuizEditData(quizId);

  if (!quiz || !quiz.course) notFound();

 return (
  <AppShell role="instructor">
   <PageHeader 
    title="Редактор теста" 
    description={`Редактирование теста: ${quiz.title}. Настройте вопросы и порог прохождения.`} 
  />

   <div className="mt-8">
    <QuizEditForm quiz={quiz as unknown as Parameters<typeof QuizEditForm>[0]["quiz"]} courseId={quiz.course.id}/>
   </div>
  </AppShell>
 );
}
