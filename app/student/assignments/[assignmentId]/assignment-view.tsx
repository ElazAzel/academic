"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Upload, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import type { StudentAssignmentDetail } from "@/types/domain";

export function AssignmentView({ assignment }: { assignment: StudentAssignmentDetail }) {
  const router = useRouter();
  const [answer, setAnswer] = useState(assignment.submission?.answerText ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !assignment.submission || 
                   assignment.submission.status === "NEEDS_REVISION" || 
                   assignment.submission.status === "DRAFT";

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assignments/${assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerText: answer }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "Ошибка при отправке задания");
      }
    } catch (err) {
      alert("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Инструкция</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {assignment.instructions}
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
              Попыток: {assignment.maxAttempts}
            </Badge>
            {assignment.deadline && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                Дедлайн: {new Date(assignment.deadline).toLocaleDateString("ru-RU")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Ваш ответ</CardTitle>
          <CardDescription>
            {canSubmit ? "Введите текст ответа или загрузите файлы." : "Задание отправлено на проверку."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Введите ваш ответ..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!canSubmit || submitting}
          />
          
          {canSubmit && (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6">
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">Загрузить файл (опционально)</p>
              </div>
            </div>
          )}

          {canSubmit && (
            <div className="flex justify-end">
              <Button disabled={submitting || !answer.trim()} onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Отправка..." : "Отправить на проверку"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {assignment.submission && (
        <Card className="rounded-2xl border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {assignment.submission.status === "ACCEPTED" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : assignment.submission.status === "NEEDS_REVISION" ? (
                <RotateCcw className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-sky-500" />
              )}
              Статус проверки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={
                assignment.submission.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                assignment.submission.status === "NEEDS_REVISION" ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-sky-50 text-sky-700 border-sky-200"
              }>
                {assignment.submission.status === "ACCEPTED" ? "Принято" :
                 assignment.submission.status === "NEEDS_REVISION" ? "Требует доработки" :
                 assignment.submission.status === "SUBMITTED" ? "На проверке" : "В работе"}
              </Badge>
              {assignment.submission.score !== null && (
                <span className="text-sm font-semibold">Оценка: {assignment.submission.score}</span>
              )}
            </div>

            {assignment.submission.feedback && (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Комментарий куратора:</p>
                <p className="text-sm italic">{assignment.submission.feedback}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Отправлено: {new Date(assignment.submission.submittedAt).toLocaleString("ru-RU")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
