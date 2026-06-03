"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import { uploadMedia } from "@/lib/upload-with-compress";
import { getSafeAssignmentUploadError } from "@/components/lms/assignment-upload-errors";
import type { StudentAssignmentDetail } from "@/types/domain";

export function AssignmentBlock({ assignment }: { assignment: StudentAssignmentDetail }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [answerText, setAnswerText] = useState(assignment.submission?.answerText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(!!assignment.submission);
  const [fileUrl, setFileUrl] = useState<string | null>(assignment.submission?.fileUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  const attemptsUsed = assignment.submission ? 1 : 0;

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
      toast.error(getSafeAssignmentUploadError(err));
    } finally {
      setUploading(false);
    }
  }

  function removeFile() {
    setFileUrl(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || (!answerText.trim() && !fileUrl)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/assignments/${assignment.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerText: answerText.trim() || undefined,
          fileUrl: fileUrl || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        const data = await res.json().catch(() => ({}));
        if (data.xp && data.xp.earned > 0) {
          toast.success(`Вы заработали +${data.xp.earned} XP за отправку задания! Всего: ${data.xp.xp} XP`);
        } else {
          toast.success("Задание отправлено на проверку");
        }
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка при отправке задания");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }, [assignment.id, answerText, fileUrl, submitting, router]);

  // ── After submission ──────────────────────────────────────────────
  if (submitted && assignment.submission) {
    const sub = assignment.submission;

    return (
      <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-body-md font-body-md text-m3-on-surface">{assignment.title}</p>
          <StatusBadge status={sub.status as BadgeStatus} />
        </div>

        {sub.answerText && (
          <div className="rounded-lg bg-m3-surface-container-high p-3">
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mb-1">Ваш ответ:</p>
            <p className="text-body-md font-body-md text-m3-on-surface whitespace-pre-wrap">{sub.answerText}</p>
          </div>
        )}

        {sub.fileUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-m3-outline-variant bg-m3-surface-container-high p-3">
            <Icon name="description" className="text-m3-primary" size={20} />
            <a
              href={sub.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-md font-body-md text-m3-primary hover:underline"
            >
              Открыть/Скачать файл
            </a>
          </div>
        )}

        {sub.score !== null && sub.score !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-label-sm text-m3-on-surface-variant">Оценка:</span>
            <span className="text-body-md font-body-md text-m3-on-surface">{sub.score}/{assignment.maxAttempts > 0 ? 100 : "—"}</span>
          </div>
        )}

        {sub.feedback && (
          <div className="rounded-lg border border-m3-tertiary-fixed-dim bg-m3-tertiary-fixed/30 p-3">
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mb-1">Комментарий:</p>
            <p className="text-body-md font-body-md text-m3-tertiary">{sub.feedback}</p>
          </div>
        )}

        {sub.status === "NEEDS_REVISION" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSubmitted(false)}
          >
            Отправить на доработку
          </Button>
        )}
      </div>
    );
  }

  // ── Before submission ─────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body-md font-body-md text-m3-on-surface">{assignment.title}</p>
          {assignment.deadline && (
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mt-0.5">Дедлайн: {assignment.deadline.slice(0, 10)}</p>
          )}
        </div>
        <StatusBadge status="upcoming" label="Задание" />
      </div>

      {/* Instructions */}
      <div
        className="rounded-lg bg-m3-surface-container-high p-4 text-body-md font-body-md leading-relaxed text-m3-on-surface-variant [&_h1]:text-title-lg [&_h1]:font-semibold [&_h1]:text-m3-on-surface [&_h2]:font-semibold [&_h2]:text-m3-on-surface [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.instructions) }}
      />

      {/* Submission info */}
      <div className="flex items-center gap-4 text-label-sm font-label-sm text-m3-on-surface-variant">
        <span>Попыток: {attemptsUsed}/{assignment.maxAttempts}</span>
        <span>Макс. балл: {assignment.maxAttempts > 0 ? 100 : "—"}</span>
      </div>

      {/* Answer textarea */}
      <textarea
        aria-label="Ответ на задание"
        name="assignmentAnswer"
        className="min-h-[120px] w-full resize-none rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-2 text-body-md font-body-md text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
        placeholder="Ваш ответ…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Загрузить файл к заданию"
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-m3-outline-variant bg-m3-surface-container-lowest/50 p-4 transition-colors hover:border-m3-primary/30 hover:bg-m3-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-m3-primary border-t-transparent" />
            <span className="text-body-sm text-m3-on-surface-variant">Загрузка…</span>
          </div>
        ) : fileUrl ? (
          <div className="flex items-center gap-2">
            <Icon name="description" className="text-m3-primary" size={20} aria-hidden="true" />
            <span className="text-body-sm font-medium text-m3-on-surface">{fileName ?? "Файл прикреплён"}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFile(); }}
              className="ml-2 rounded-full p-1 text-m3-on-surface-variant hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
              aria-label="Удалить файл"
            >
              <Icon name="close" size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Icon name="upload_file" className="mx-auto mb-1 text-m3-on-surface-variant/40" size={24} aria-hidden="true" />
            <p className="text-body-sm text-m3-on-surface-variant">Нажмите, чтобы загрузить файл (PDF, изображение)</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        name="assignmentFile"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.zip,.doc,.docx"
        onChange={handleFileUpload}
      />

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || (!answerText.trim() && !fileUrl)}
          size="sm"
        >
          <Icon name="send" size={16} className="mr-1" />
          {submitting ? "Отправка…" : "Отправить"}
        </Button>
      </div>
    </div>
  );
}
