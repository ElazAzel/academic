"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RotateCcw, Send, Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readApiErrorMessage } from "@/lib/api-client";
import { uploadMedia } from "@/lib/upload-with-compress";
import { toast } from "sonner";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import type { StudentAssignmentDetail } from "@/types/domain";

export function AssignmentView({ assignment }: { assignment: StudentAssignmentDetail }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState(assignment.submission?.answerText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(assignment.submission?.fileUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadMedia(file, "submissions");
      setFileUrl(result.publicUrl);
      setFileName(result.fileName);
      toast.success("Файл загружен");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сети при загрузке файла");
    } finally {
      setUploading(false);
    }
  }

  function removeFile() {
    setFileUrl(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit =
    !assignment.submission ||
    assignment.submission.status === "NEEDS_REVISION" ||
    assignment.submission.status === "DRAFT";

  async function handleSubmit() {
    if (submitting || (!answer.trim() && !fileUrl)) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/assignments/${assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerText: answer, fileUrl }),
      });

      if (response.ok) {
        router.refresh();
        return;
      }

      toast.error(await readApiErrorMessage(response, "Ошибка при отправке задания"));
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  const submission = assignment.submission;
  const courseHref = assignment.courseId ? `/student/courses/${assignment.courseId}` : "/student/my-courses";
  const lessonHref = assignment.lessonId ? `/student/lessons/${assignment.lessonId}` : courseHref;

  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">Инструкция</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {assignment.instructions}
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="open" label={`Попыток: ${assignment.maxAttempts}`} />
            {assignment.deadline ? (
              <StatusBadge status="upcoming" label={`Дедлайн: ${new Date(assignment.deadline).toLocaleDateString("ru-RU")}`} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">Ваш ответ</CardTitle>
          <CardDescription>
            {canSubmit ? "Введите текст ответа или приложите файл." : "Задание отправлено на проверку."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-[200px] w-full resize-y rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Введите ваш ответ..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={!canSubmit || submitting}
          />

          {canSubmit ? (
            <div className="space-y-3">
              <div
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6 transition-colors hover:border-primary/30 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Загрузка...</p>
                  </div>
                ) : fileUrl ? (
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{fileName ?? "Файл прикреплён"}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto mb-1 h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Нажмите, чтобы загрузить файл (PDF, изображение, архив)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.zip,.doc,.docx"
                onChange={handleFileUpload}
              />
            </div>
          ) : null}

          {canSubmit ? (
            <div className="flex justify-end">
              <Button disabled={submitting || (!answer.trim() && !fileUrl)} onClick={handleSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Отправка..." : "Отправить на проверку"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {submission ? (
        <Card className="rounded-lg border-primary/10">
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
              <StatusBadge status={submission.status as BadgeStatus} />
              {submission.score !== null ? <span className="text-sm font-semibold">Оценка: {submission.score}</span> : null}
            </div>

            {submission.fileUrl ? (
              <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Прикреплённый файл:
                </p>
                <div className="flex items-center gap-2">
                  <File className="h-5 w-5 text-primary" />
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Открыть/Скачать файл
                  </a>
                </div>
              </div>
            ) : null}

            {submission.feedback ? (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Комментарий куратора:
                </p>
                <p className="text-sm italic">{submission.feedback}</p>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Отправлено: {new Date(submission.submittedAt).toLocaleString("ru-RU")}
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href={lessonHref}>
                <ArrowLeft className="h-4 w-4" />
                {assignment.lessonId ? "Вернуться к уроку" : "Вернуться к курсу"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
