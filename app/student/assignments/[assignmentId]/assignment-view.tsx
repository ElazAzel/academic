"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Send, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readApiErrorMessage } from "@/lib/api-client";
import type { StudentAssignmentDetail } from "@/types/domain";

export function AssignmentView({ assignment }: { assignment: StudentAssignmentDetail }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(assignment.submission?.answerText ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !assignment.submission ||
    assignment.submission.status === "NEEDS_REVISION" ||
    assignment.submission.status === "DRAFT";

  async function handleSubmit() {
    if (submitting || !answer.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assignments/${assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerText: answer }),
      });

      if (response.ok) {
        router.refresh();
        return;
      }

      alert(await readApiErrorMessage(response, "Ошибка при отправке задания"));
    } catch {
      alert("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  const submission = assignment.submission;

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Инструкция</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {assignment.instructions}
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">Попыток: {assignment.maxAttempts}</Badge>
            {assignment.deadline ? (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                Дедлайн: {new Date(assignment.deadline).toLocaleDateString("ru-RU")}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Ваш ответ</CardTitle>
          <CardDescription>
            {canSubmit ? "Введите текст ответа или приложите файл." : "Задание отправлено на проверку."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-[200px] w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Введите ваш ответ..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={!canSubmit || submitting}
          />

          {canSubmit ? (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6">
              <div className="text-center">
                <Upload className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Загрузить файл (опционально)</p>
              </div>
            </div>
          ) : null}

          {canSubmit ? (
            <div className="flex justify-end">
              <Button disabled={submitting || !answer.trim()} onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Отправка..." : "Отправить на проверку"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {submission ? (
        <Card className="rounded-2xl border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {submission.status === "ACCEPTED" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : submission.status === "NEEDS_REVISION" ? (
                <RotateCcw className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-sky-500" />
              )}
              Статус проверки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                className={
                  submission.status === "ACCEPTED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : submission.status === "NEEDS_REVISION"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }
              >
                {submission.status === "ACCEPTED"
                  ? "Принято"
                  : submission.status === "NEEDS_REVISION"
                    ? "Требует доработки"
                    : submission.status === "SUBMITTED"
                      ? "На проверке"
                      : "В работе"}
              </Badge>
              {submission.score !== null ? <span className="text-sm font-semibold">Оценка: {submission.score}</span> : null}
            </div>

            {submission.feedback ? (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Комментарий куратора:
                </p>
                <p className="text-sm italic">{submission.feedback}</p>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Отправлено: {new Date(submission.submittedAt).toLocaleString("ru-RU")}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
