import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getForwardedQuestions } from "@/server/actions/dashboard";
import { answerForwardedQuestionAction } from "@/server/actions/curator";

export const dynamic = "force-dynamic";

export default async function InstructorQuestionsPage() {
  await requireRolePage(["instructor", "admin"]);
  const questions = await getForwardedQuestions();

  return (
    <AppShell role="instructor">
      <PageHeader title="Вопросы от кураторов" description="Переадресованные вам вопросы слушателей."/>
      <div className="mt-6 space-y-4">
        {questions.length === 0 ? (
          <Card className="border-m3-outline-variant bg-m3-surface-container-lowest">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Icon name="forum" className="text-[40px] text-m3-on-surface-variant/40" />
              <p className="font-body-md text-body-md text-m3-on-surface-variant">Нет переадресованных вопросов.</p>
            </CardContent>
          </Card>
        ) : (
          questions.map((q) => (
            <Card key={q.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-body-sm text-body-sm">
                    <Icon name="person" className="text-[18px] text-m3-on-surface-variant" />
                    <span className="font-label-md text-label-md text-m3-on-surface">{q.studentName}</span>
                    <Badge variant="outline" className="border-m3-tertiary text-m3-tertiary bg-m3-tertiary-container/10">Передан</Badge>
                  </div>
                  <span className="font-body-sm text-body-sm text-m3-on-surface-variant">от {q.curatorName}</span>
                </div>
                <div className="flex items-center gap-1 font-body-sm text-body-sm text-m3-on-surface-variant mt-1">
                  <Icon name="book" className="text-[14px]" /> {q.courseTitle} → {q.moduleTitle} → {q.lessonTitle}
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-body-md text-body-md text-m3-on-surface mb-4">{q.text}</p>
                <form action={answerForwardedQuestionAction}>
                  <input type="hidden" name="questionId" value={q.id}/>
                  <Textarea
                    name="answer"
                    placeholder="Введите ответ..."
                    required
                    className="mb-2 border-m3-outline-variant bg-m3-surface-container-lowest font-body-md text-body-md text-m3-on-surface placeholder:text-m3-on-surface-variant focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20"
                  />
                  <Button type="submit" size="sm">
                    <Icon name="send" className="text-[18px]" />
                    Отправить ответ
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
