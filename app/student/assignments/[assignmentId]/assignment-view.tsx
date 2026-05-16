"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Send, Upload, File, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readApiErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
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
      // Get presigned URL
      const presignRes = await fetch("/api/v1/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка при подготовке загрузки");
        return;
      }

      const { url, publicUrl } = await presignRes.json();

      // Upload to S3
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        toast.error("Ошибка при загрузке файла");
        return;
      }

      setFileUrl(publicUrl);
      setFileName(file.name);
      toast.success("Файл загружен");
    } catch {
      toast.error("Ошибка сети при загрузке файла");
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
            <div className="space-y-3">
              <div
                className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-6 transition-colors hover:border-primary/30 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
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
