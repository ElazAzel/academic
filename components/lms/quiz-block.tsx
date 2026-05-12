"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudentQuizDetail } from "@/types/domain";

type QuizPhase = "idle" | "active" | "result" | "review";

export function QuizBlock({ quiz }: { quiz: StudentQuizDetail }) {
  const router = useRouter();
  const [phase, setPhase] = useState<QuizPhase>("idle");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const progressPercent = Math.round(((Object.keys(answers).length) / quiz.questions.length) * 100);

  const handleOptionChange = useCallback((questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, []);

  const questionsCount = quiz.questions.length;

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (Object.keys(answers).length < questionsCount) {
      if (!confirm("Вы ответили не на все вопросы. Всё равно отправить?")) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ score: data.grading?.score ?? data.score, passed: data.passed });
        setPhase("result");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка при отправке теста");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }, [quiz.id, answers, submitting, router, questionsCount]);

  // ── Idle / before start ────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{quiz.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{quiz.questionsCount} вопросов · порог {quiz.passThreshold}% · {quiz.maxAttempts} попытки</p>
          </div>
          <Badge className="border-amber-200 bg-amber-50 text-amber-700">Тест</Badge>
        </div>
        <Button onClick={() => setPhase("active")} size="sm">
          Начать тест
        </Button>
      </div>
    );
  }

  // ── Active (during quiz) ──────────────────────────────────────────
  if (phase === "active") {
    return (
      <div className="rounded-2xl border bg-card">
        {/* Question numbers */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b overflow-x-auto">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <CardContent className="space-y-4 py-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Вопрос {currentIndex + 1} из {quiz.questions.length}</span>
            <span>{Math.round((Object.keys(answers).length / quiz.questions.length) * 100)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1" />

          {/* Question */}
          <p className="text-sm font-medium">{currentQuestion.text}</p>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  answers[currentQuestion.id] === option
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  className="h-4 w-4 text-primary focus:ring-primary"
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleOptionChange(currentQuestion.id, option)}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              Назад
            </Button>
            {currentIndex < quiz.questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                Далее
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {submitting ? "Отправка..." : "Завершить тест"}
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────
  if (phase === "result") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          {result?.passed ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          ) : (
            <XCircle className="h-10 w-10 text-rose-600" />
          )}
        </div>
        <div>
          <p className="text-3xl font-bold">{result?.score ?? 0}%</p>
          <Badge
            className={
              result?.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 mt-2"
                : "border-rose-200 bg-rose-50 text-rose-700 mt-2"
            }
          >
            {result?.passed ? "Пройден" : "Не пройден"}
          </Badge>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" onClick={() => setPhase("review")}>
            Посмотреть ответы
          </Button>
          {result?.passed ? (
            <Button size="sm" variant="secondary" onClick={() => { setPhase("idle"); setAnswers({}); setResult(null); setCurrentIndex(0); }}>
              Продолжить урок
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => { setPhase("idle"); setAnswers({}); setResult(null); setCurrentIndex(0); }}>
              Повторить тест
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Review ────────────────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold">Ответы</p>
        {quiz.questions.map((q, i) => {
          const selected = answers[q.id];
          return (
            <div key={q.id} className="rounded-xl border p-4 space-y-2">
              <p className="text-sm font-medium">{i + 1}. {q.text}</p>
              <div className="space-y-1">
                {q.options.map((option) => {
                  const isSelected = selected === option;
                  return (
                    <div
                      key={option}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        isSelected ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                      }`}
                    >
                      {isSelected && <span className="text-primary">▶</span>}
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <Button size="sm" variant="ghost" onClick={() => setPhase("result")}>
          Назад к результату
        </Button>
      </div>
    );
  }

  return null;
}
