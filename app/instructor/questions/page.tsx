import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getForwardedQuestions } from "@/server/actions/dashboard";
import { answerForwardedQuestionAction } from "@/server/actions/curator";
import { BookOpen, MessageCircle, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorQuestionsPage() {
  await requireRolePage(["instructor", "admin"]);
  const questions = await getForwardedQuestions();

  return (
    <AppShell role="instructor">
      <PageHeader title="Вопросы от кураторов" description="Передлессованные вам вопросы слушателей."/>
      <div className="mt-6 space-y-4">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40"/>
              <p className="text-muted-foreground">Нет передресованных вопросов.</p>
            </CardContent>
          </Card>
        ) : (
          questions.map((q) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground"/>
                    <span className="font-medium">{q.studentName}</span>
                    <Badge className="border-sky-200 bg-sky-50 text-sky-700">Передан</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">от {q.curatorName}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <BookOpen className="h-3 w-3"/> {q.courseTitle} → {q.moduleTitle} → {q.lessonTitle}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{q.text}</p>
                <form action={answerForwardedQuestionAction}>
                  <input type="hidden" name="questionId" value={q.id}/>
                  <Textarea name="answer" placeholder="Введите ответ..." required className="mb-2"/>
                  <Button type="submit" size="sm">Отправить ответ</Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
