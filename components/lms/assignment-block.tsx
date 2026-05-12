"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHtml } from "@/lib/sanitize";
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
    const statusLabel: Record<string, { label: string; cls: string }> = {
      SUBMITTED: { label: "Отправлено", cls: "border-sky-200 bg-sky-50 text-sky-700" },
      IN_REVIEW: { label: "На проверке", cls: "border-amber-200 bg-amber-50 text-amber-700" },
      ACCEPTED: { label: "Зачтено", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      REJECTED: { label: "Отклонено", cls: "border-rose-200 bg-rose-50 text-rose-700" },
      NEEDS_REVISION: { label: "На доработку", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    };
    const sb = statusLabel[sub.status] ?? statusLabel.SUBMITTED;

    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{assignment.title}</p>
          <Badge className={sb.cls}>{sb.label}</Badge>
        </div>

        {sub.answerText && (
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">Ваш ответ:</p>
            <p className="text-sm whitespace-pre-wrap">{sub.answerText}</p>
          </div>
        )}

        {sub.score !== null && sub.score !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Оценка:</span>
            <span className="text-sm font-semibold">{sub.score}/{assignment.maxAttempts > 0 ? 100 : "—"}</span>
          </div>
        )}

        {sub.feedback && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Комментарий:</p>
            <p className="text-sm text-emerald-900">{sub.feedback}</p>
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
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{assignment.title}</p>
          {assignment.deadline && (
            <p className="text-xs text-muted-foreground mt-0.5">Дедлайн: {assignment.deadline.slice(0, 10)}</p>
          )}
        </div>
        <Badge className="border-violet-200 bg-violet-50 text-violet-700">Задание</Badge>
      </div>

      {/* Instructions */}
      <div
        className="rounded-xl bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.instructions) }}
      />

      {/* Submission info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Попыток: {attemptsUsed}/{assignment.maxAttempts}</span>
        <span>Макс. балл: {assignment.maxAttempts > 0 ? 100 : "—"}</span>
      </div>

      {/* Answer textarea */}
      <textarea
        className="min-h-[120px] w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-950"
        placeholder="Ваш ответ..."
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
      />

      {/* File URL input (placeholder — actual file upload TBD) */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-950"
          placeholder="Ссылка на файл (необязательно)"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
        />
        <Button size="sm" variant="secondary" disabled>
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || (!answerText.trim() && !fileUrl)}
          size="sm"
        >
          <Send className="h-4 w-4 mr-1" />
          {submitting ? "Отправка..." : "Отправить"}
        </Button>
      </div>
    </div>
  );
}
