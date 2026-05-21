"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import type { StudentAssignmentDetail } from "@/types/domain";

export function AssignmentBlock({ assignment }: { assignment: StudentAssignmentDetail }) {
  const router = useRouter();
  const [answerText, setAnswerText] = useState(assignment.submission?.answerText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!assignment.submission);
  const [fileUrl, setFileUrl] = useState(assignment.submission?.fileUrl ?? "");

  const attemptsUsed = assignment.submission ? 1 : 0;

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
        toast.success("Задание отправлено на проверку");
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
      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-body-md font-body-md text-m3-on-surface">{assignment.title}</p>
          <StatusBadge status={sub.status as BadgeStatus} />
        </div>

        {sub.answerText && (
          <div className="rounded-xl bg-m3-surface-container-high p-3">
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mb-1">Ваш ответ:</p>
            <p className="text-body-md font-body-md text-m3-on-surface whitespace-pre-wrap">{sub.answerText}</p>
          </div>
        )}

        {sub.score !== null && sub.score !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-label-sm text-m3-on-surface-variant">Оценка:</span>
            <span className="text-body-md font-body-md text-m3-on-surface">{sub.score}/{assignment.maxAttempts > 0 ? 100 : "—"}</span>
          </div>
        )}

        {sub.feedback && (
          <div className="rounded-xl border border-m3-tertiary-fixed-dim bg-m3-tertiary-fixed/30 p-3">
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
    <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
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
        className="rounded-xl bg-m3-surface-container-high p-4 text-body-md font-body-md leading-relaxed text-m3-on-surface-variant [&_h1]:text-title-lg [&_h1]:font-semibold [&_h1]:text-m3-on-surface [&_h2]:font-semibold [&_h2]:text-m3-on-surface [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.instructions) }}
      />

      {/* Submission info */}
      <div className="flex items-center gap-4 text-label-sm font-label-sm text-m3-on-surface-variant">
        <span>Попыток: {attemptsUsed}/{assignment.maxAttempts}</span>
        <span>Макс. балл: {assignment.maxAttempts > 0 ? 100 : "—"}</span>
      </div>

      {/* Answer textarea */}
      <textarea
        className="min-h-[120px] w-full resize-none rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-2 text-body-md font-body-md text-m3-on-surface outline-none focus:ring-2 focus:ring-m3-outline placeholder:text-m3-on-surface-variant/50"
        placeholder="Ваш ответ..."
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
      />

      {/* File URL input (placeholder — actual file upload TBD) */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest px-3 py-2 text-body-md font-body-md text-m3-on-surface outline-none focus:ring-2 focus:ring-m3-outline placeholder:text-m3-on-surface-variant/50"
          placeholder="Ссылка на файл (необязательно)"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
        <Button size="sm" variant="secondary" disabled>
          <Icon name="upload_file" size={16} />
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || (!answerText.trim() && !fileUrl)}
          size="sm"
        >
          <Icon name="send" size={16} className="mr-1" />
          {submitting ? "Отправка..." : "Отправить"}
        </Button>
      </div>
    </div>
  );
}
