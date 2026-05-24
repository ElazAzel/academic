import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { notFound } from "next/navigation";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorActivity } from "@/server/actions/super-curator";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import type { DashboardMetric } from "@/types/domain";
import { QuestionStatus } from "@prisma/client";

export const metadata = {
  title: "Куратор — Супер-куратор",
  description: "Профиль и статистика куратора.",
};


export const dynamic = "force-dynamic";

export default async function CuratorDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await requireRolePage(["super_curator", "admin"]);
  const data = await getCuratorActivity(id);
  if (!data) notFound();

  const { curator, questions, reviews, activityLog, studentResponseBreakdown = [] } = data;

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
  const responseRate = questions.length > 0 ? Math.round((answered.length / questions.length) * 100) : 0;
  const metrics = [
    {
      label: "Ответы",
      value: `${responseRate}%`,
      tone: responseRate >= 80 ? "success" : responseRate >= 50 ? "warning" : "danger",
      detail: `${answered.length}/${questions.length} вопросов`,
      priority: unanswered.length > 0 ? "elevated" : "normal",
    },
    {
      label: "Открытые вопросы",
      value: unanswered.length,
      tone: unanswered.length > 0 ? "warning" : "success",
      detail: "В очереди куратора",
      priority: unanswered.length > 0 ? "elevated" : "normal",
    },
    {
      label: "Ср. ответ",
      value: avgResponseTime < 1 ? "<1ч" : `${Math.round(avgResponseTime)}ч`,
      tone: avgResponseTime > 24 ? "danger" : avgResponseTime > 8 ? "warning" : "success",
      detail: "По закрытым вопросам",
      priority: avgResponseTime > 24 ? "critical" : avgResponseTime > 8 ? "elevated" : "normal",
    },
    {
      label: "Проверено работ",
      value: reviews.length,
      tone: "info",
      detail: "История проверок",
    },
    {
      label: "Последний вход",
      value: daysSinceLogin !== null ? `${daysSinceLogin} дн.` : "—",
      tone: daysSinceLogin === null || daysSinceLogin >= 7 ? "warning" : "success",
      detail: `${activityLog.length} действий за 30 дн.`,
      priority: daysSinceLogin === null || daysSinceLogin >= 7 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="super_curator">
      <PageHeader
        title={curator.name}
        description={curator.email}
      />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
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
                        <TableHead>Время отв.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Нет вопросов</TableCell></TableRow>
                      ) : questions.map((q) => {
                        const respHours = q.answeredAt && q.createdAt
                          ? (new Date(q.answeredAt).getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60)
                          : null;
                        return (
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
                          <TableCell className="text-xs">
                            {respHours !== null ? (
                              <span className={respHours > 24 ? "text-red-600 font-medium" : respHours > 8 ? "text-amber-600" : "text-emerald-600"}>
                                {respHours < 1 ? "<1ч" : `${Math.round(respHours)}ч`}
                              </span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                        );
                      })}
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
            label: `По студентам (${studentResponseBreakdown.length})`,
            content: (
              <Card className="rounded-2xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Студент</TableHead>
                        <TableHead>Ср. ответ (вопросы)</TableHead>
                        <TableHead>Отвечено вопросов</TableHead>
                        <TableHead>Ср. ответ (чат)</TableHead>
                        <TableHead>Ответов в чате</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentResponseBreakdown.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                      ) : studentResponseBreakdown.map((s) => (
                        <TableRow key={s.studentId}>
                          <TableCell className="text-sm">{s.studentName}</TableCell>
                          <TableCell>
                            <span className={s.avgQuestionHours > 24 ? "text-red-600 font-medium" : s.avgQuestionHours > 8 ? "text-amber-600" : "text-emerald-600"}>
                              {s.avgQuestionHours > 0 ? `${s.avgQuestionHours}ч` : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{s.questionCount}</TableCell>
                          <TableCell>
                            <span className={s.avgChatHours > 24 ? "text-red-600 font-medium" : s.avgChatHours > 8 ? "text-amber-600" : "text-emerald-600"}>
                              {s.avgChatHours > 0 ? `${s.avgChatHours}ч` : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{s.chatResponseCount}</TableCell>
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
