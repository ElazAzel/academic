"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LessonQuestionSummary } from "@/types/domain";

export function AskCuratorQuestion({
  lessonId,
  initialQuestions,
}: {
  lessonId: string;
  initialQuestions: LessonQuestionSummary[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState(initialQuestions);

  const askQuestion = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setQuestions((prev) => [created, ...prev]);
        setText("");
        toast.success("Вопрос отправлен куратору");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Не удалось отправить вопрос");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <p className="text-sm font-medium">Задать вопрос куратору</p>
      <p className="text-xs text-muted-foreground">Опишите вашу проблему по материалам урока.</p>
      <div className="space-y-3">
        <textarea
          className="min-h-[80px] w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Ваш вопрос..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end">
          <Button onClick={askQuestion} disabled={sending || !text.trim()} size="sm">
            <Send className="h-4 w-4 mr-1" />
            {sending ? "Отправка..." : "Отправить"}
          </Button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground">История вопросов</p>
          {questions.map((q) => (
            <div key={q.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <Badge
                  className={
                    q.status === "open"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-[10px]"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]"
                  }
                >
                  {q.status === "open" ? "Ожидает ответа" : "Отвечен"}
                </Badge>
              </div>
              <p className="text-sm">{q.text}</p>
              {q.answer && (
                <div className="mt-2 rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
                  <p className="text-xs text-emerald-900">{q.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
