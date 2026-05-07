import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QuizEditForm } from "@/components/instructor/quiz-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorEditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { quizId } = await params;
  const prisma = getPrisma();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } }
  });

  if (!quiz) notFound();

  return (
    <AppShell role="instructor">
      <PageHeader 
        title="Редактор теста" 
        description={`Редактирование теста: ${quiz.title}. Настройте вопросы и порог прохождения.`} 
        badge="Преподаватель" 
      />

      <div className="mt-8">
        <QuizEditForm quiz={quiz as unknown as Parameters<typeof QuizEditForm>[0]["quiz"]} />
      </div>
    </AppShell>
  );
}
