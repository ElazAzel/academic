import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { notFound } from "next/navigation";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorActivity } from "@/server/actions/super-curator";
import { DonutChart } from "@/components/lms/bar-chart";
import { QuestionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CuratorDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireRolePage(["super_curator", "admin"]);
  const data = await getCuratorActivity(id);
  if (!data) notFound();

  const { curator, questions, reviews, activityLog } = data;

  const answered = questions.filter((q) => q.status === QuestionStatus.ANSWERED || q.status === QuestionStatus.CLOSED);
  const unanswered = questions.filter((q) => q.status === QuestionStatus.OPEN);
  const avgResponseTime = answered.length > 0
    ? answered.reduce((sum, q) => {
        if (!q.answeredAt) return sum;
        return sum + (new Date(q.answeredAt).getTime() - new Date(q.createdAt).getTime());
      }, 0) / answered.length / (1000 * 60 * 60)
    : 0;

  const daysSinceLogin = curator.lastLoginAt
    ? Math.floor((Date.now() - new Date(curator.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <AppShell role="super_curator">
      <PageHeader
        title={curator.name}
        description={curator.email}
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <DonutChart value={answered.length} max={Math.max(answered.length + unanswered.length, 1)} size={60} strokeWidth={5} />
            <p className="text-xs text-muted-foreground">Ответов ({answered.length}/{questions.length})</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{avgResponseTime < 1 ? "<1" : Math.round(avgResponseTime)}</p>
            <p className="text-xs text-muted-foreground">Ср. время ответа (ч)</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{reviews.length}</p>
            <p className="text-xs text-muted-foreground">Проверено работ</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{daysSinceLogin !== null ? `${daysSinceLogin} дн.` : "—"}</p>
            <p className="text-xs text-muted-foreground">С последнего входа</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{activityLog.length}</p>
            <p className="text-xs text-muted-foreground">Действий за 30 дн.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        tabs={[
          {
            label: `Вопросы (${questions.length})`,
            content: (
              <Card className="rounded-2xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Студент</TableHead>
                        <TableHead>Вопрос</TableHead>
                        <TableHead>Урок</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Создан</TableHead>
                        <TableHead>Ответ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет вопросов</TableCell></TableRow>
                      ) : questions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="text-sm">{q.studentName}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{q.text}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{q.lessonTitle}</TableCell>
                          <TableCell>
                            <Badge className={q.status === QuestionStatus.ANSWERED || q.status === QuestionStatus.CLOSED ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                              {q.status === QuestionStatus.ANSWERED ? "Отвечен" : q.status === QuestionStatus.CLOSED ? "Закрыт" : "Открыт"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleString("ru")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {q.answer ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          },
          {
            label: `Проверки (${reviews.length})`,
            content: (
              <Card className="rounded-2xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Студент</TableHead>
                        <TableHead>Задание</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Оценка</TableHead>
                        <TableHead>Отправлено</TableHead>
                        <TableHead>Проверено</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Нет проверок</TableCell></TableRow>
                      ) : reviews.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.studentName}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{r.assignmentTitle}</TableCell>
                          <TableCell>
                            <Badge className={
                              r.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" :
                              r.status === "REJECTED" ? "bg-red-50 text-red-700" :
                              "bg-amber-50 text-amber-700"
                            }>
                              {r.status === "ACCEPTED" ? "Принято" : r.status === "REJECTED" ? "Отклонено" : "На проверке"}
                            </Badge>
                          </TableCell>
                          <TableCell>{r.score ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(r.submittedAt).toLocaleString("ru")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.reviewedAt ? new Date(r.reviewedAt).toLocaleString("ru") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          },
          {
            label: `Активность (${activityLog.length})`,
            content: (
              <Card className="rounded-2xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Действие</TableHead>
                        <TableHead>Ресурс</TableHead>
                        <TableHead>Время</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLog.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Нет активности за 30 дней</TableCell></TableRow>
                      ) : activityLog.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{l.action}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.resource ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("ru")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
