import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getQuizForStudent } from "@/server/modules/learning/service";
import { QuizView } from "./quiz-view";
import { ApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function StudentQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
 const user = await requireRolePage(["student"]);
 const { quizId } = await params;

 let quiz;
 try {
  quiz = await getQuizForStudent(user.id, quizId);
 } catch (error) {
  if (error instanceof ApiError && error.code === "not_found") {
   notFound();
  }
  throw error;
 }

 return (
  <AppShell role="student">
   <div className="mb-4">
    <Button asChild size="sm" variant="secondary">
     <Link href={`/student/lessons/${quiz.lessonId}`}>
      <ArrowLeft className="h-4 w-4"/>
      Назад к уроку
     </Link>
    </Button>
   </div>
   <PageHeader 
    title={quiz.title} 
    description={`${quiz.questionsCount} вопросов · порог ${quiz.passThreshold}% · ${quiz.maxAttempts} попытки`} 
  />
   <QuizView quiz={quiz}/>
  </AppShell>
 );
}
