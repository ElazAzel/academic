import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getQuizForStudent } from "@/server/modules/learning/service";
import { QuizView } from "./quiz-view";
import { ApiError } from "@/lib/http";
import { FORBIDDEN_ROUTE } from "@/lib/constants";

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
    if (error instanceof ApiError && error.code === "forbidden") {
     redirect(FORBIDDEN_ROUTE);
    }
   throw error;
 }

 const courseHref = quiz.courseId ? `/student/courses/${quiz.courseId}` : "/student/my-courses";
 const lessonHref = quiz.lessonId ? `/student/lessons/${quiz.lessonId}` : courseHref;

 return (
  <AppShell role="student">
   <div className="mb-4">
    <Button asChild size="sm" variant="secondary">
     <Link href={lessonHref}>
      <ArrowLeft className="h-4 w-4"/>
      {quiz.lessonId ? "Назад к уроку" : "Назад к курсу"}
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
