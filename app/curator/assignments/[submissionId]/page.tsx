import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSubmissionDetail } from "@/server/actions/curator";
import { ReviewSubmissionForm } from "@/components/curator/review-submission-form";
import type { SubmissionStatus } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Отправлено",
  IN_REVIEW: "На проверке",
  ACCEPTED: "Зачтено",
  REJECTED: "Отклонено",
  NEEDS_REVISION: "На доработку",
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-sky-100 text-sky-700 border-sky-200",
  IN_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  NEEDS_REVISION: "bg-violet-100 text-violet-700 border-violet-200",
};

function StatusBadgeInline({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireRolePage(["curator", "super_curator"]);
  const { submissionId } = await params;

  let data;
  try {
    data = await getSubmissionDetail(submissionId);
  } catch {
    notFound();
  }

  const { submission } = data;
  const isReviewed = submission.status === "ACCEPTED" || submission.status === "REJECTED";

  return (
    <AppShell role="curator">
      <PageHeader
        title={submission.assignment.title}
        description={`${submission.student.name ?? submission.student.email} · Попытка #${submission.attemptNumber}`}
      >
        <Link
          href={`/curator/assignments`}
          className="inline-flex items-center gap-1 text-sm text-m3-on-surface-variant hover:text-m3-on-surface transition-colors"
        >
          <Icon name="arrow_back" size={16} />
          Назад к списку
        </Link>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3 mt-4">
        {/* Main content — answer + review */}
        <div className="md:col-span-2 space-y-6">
          {/* Answer card */}
          <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Ответ студента</CardTitle>
                <StatusBadgeInline status={submission.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {submission.answerText ? (
                <div className="rounded-xl bg-m3-surface-container-high p-4 text-body-md font-body-md leading-relaxed whitespace-pre-wrap text-m3-on-surface">
                  {submission.answerText}
                </div>
              ) : (
                <p className="text-body-md font-body-md text-m3-on-surface-variant italic">Текст ответа отсутствует</p>
              )}

              {submission.fileUrl ? (
                <div className="flex items-center gap-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-high p-3">
                  <Icon name="description" className="text-m3-primary" size={20} />
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-md font-body-md text-m3-primary hover:underline"
                  >
                    Открыть/Скачать файл
                  </a>
                </div>
              ) : null}

              {submission.reviewedBy && (
                <div className="flex items-center gap-2 text-label-sm text-m3-on-surface-variant">
                  <Icon name="person" size={14} />
                  Проверил: {submission.reviewedBy.name ?? "Неизвестно"}
                  {submission.reviewedAt && ` · ${new Date(submission.reviewedAt).toLocaleString("ru-RU")}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review form */}
          {!isReviewed ? (
            <ReviewSubmissionForm submission={submission} />
          ) : (
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader className="pb-3">
                <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Результат проверки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-label-sm text-m3-on-surface-variant">Оценка:</span>
                  <span className="text-body-md font-body-md font-bold text-m3-on-surface">{submission.score}/{submission.assignment.maxScore}</span>
                </div>
                {submission.feedback && (
                  <div className="rounded-xl border border-m3-tertiary-fixed-dim bg-m3-tertiary-fixed/30 p-4">
                    <p className="text-label-sm font-label-sm text-m3-on-surface-variant mb-1">Комментарий:</p>
                    <p className="text-body-md font-body-md text-m3-tertiary whitespace-pre-wrap">{submission.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment info */}
          <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <CardHeader className="pb-2">
              <CardTitle className="font-label-md text-label-md text-m3-on-surface">О задании</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-body-sm font-body-sm text-m3-on-surface-variant">
              <div className="flex items-center gap-2">
                <Icon name="school" size={16} />
                <span>{submission.assignment.course?.title ?? "Без курса"}</span>
              </div>
              {submission.assignment.lesson && (
                <div className="flex items-center gap-2">
                  <Icon name="menu_book" size={16} />
                  <span>{submission.assignment.lesson.title}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon name="fact_check" size={16} />
                <span>Макс. балл: {submission.assignment.maxScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="replay" size={16} />
                <span>Попыток: {submission.attemptNumber}/{submission.assignment.maxAttempts}</span>
              </div>
              {submission.assignment.deadline && (
                <div className="flex items-center gap-2">
                  <Icon name="calendar_today" size={16} />
                  <span>Дедлайн: {new Date(submission.assignment.deadline).toLocaleDateString("ru-RU")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon name="person" size={16} />
                <span>{submission.student.name ?? submission.student.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="schedule" size={16} />
                <span>Отправлено: {new Date(submission.submittedAt).toLocaleString("ru-RU")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Previous attempts */}
          {submission.previousAttempts.length > 0 && (
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader className="pb-2">
                <CardTitle className="font-label-md text-label-md text-m3-on-surface">Предыдущие попытки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {submission.previousAttempts.map((a: { id: string; status: string; score: number | null; submittedAt: string }) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-m3-surface-container-high px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusBadgeInline status={a.status} />
                      {a.score !== null && (
                        <span className="text-label-sm text-m3-on-surface-variant">{a.score} баллов</span>
                      )}
                    </div>
                    <span className="text-label-sm text-m3-on-surface-variant">
                      {new Date(a.submittedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
