"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const EMOJIS = [
  { value: 1, label: "😡", text: "Ужасно" },
  { value: 2, label: "😐", text: "Нормально" },
  { value: 3, label: "😊", text: "Хорошо" },
  { value: 4, label: "🤩", text: "Отлично" },
];

export function LessonRating({ lessonId }: { lessonId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitRating = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}/rating`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success("Спасибо за оценку!");
      } else {
        toast.error("Не удалось отправить оценку");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">Вы оценили этот урок. Спасибо!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <p className="text-sm font-medium">Оцените занятие</p>
      <div className="flex items-center gap-3">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji.value}
            onClick={() => setRating(emoji.value)}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-lg transition-all ${
              rating === emoji.value
                ? "bg-primary/10 ring-2 ring-primary/30"
                : "hover:bg-muted"
            }`}
          >
            <span className="text-2xl">{emoji.label}</span>
            <span className="text-[10px] text-muted-foreground">{emoji.text}</span>
          </button>
        ))}
      </div>
      {rating && (
        <div className="space-y-3">
          <textarea
            className="min-h-[60px] w-full resize-none rounded-xl border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={submitRating} disabled={submitting} size="sm">
              {submitting ? "Отправка..." : "Отправить оценку"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
