"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
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
      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-md font-body-md text-m3-on-surface">{quiz.title}</p>
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mt-0.5">{quiz.questionsCount} вопросов · порог {quiz.passThreshold}% · {quiz.maxAttempts} попытки</p>
          </div>
          <Badge className="border-m3-secondary-fixed-dim bg-m3-secondary-fixed text-m3-secondary">Тест</Badge>
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
      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        {/* Question numbers */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-m3-outline-variant overflow-x-auto">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-label-sm font-label-sm transition-colors ${
                i === currentIndex
                  ? "bg-m3-primary text-m3-on-primary"
                  : answers[q.id]
                  ? "bg-m3-primary-container text-m3-primary"
                  : "bg-m3-surface-container-high text-m3-on-surface-variant"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <CardContent className="space-y-4 py-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-label-sm font-label-sm text-m3-on-surface-variant">
            <span>Вопрос {currentIndex + 1} из {quiz.questions.length}</span>
            <span>{Math.round((Object.keys(answers).length / quiz.questions.length) * 100)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1" />

          {/* Question */}
          <p className="text-body-md font-body-md text-m3-on-surface">{currentQuestion.text}</p>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  answers[currentQuestion.id] === option
                    ? "border-m3-primary bg-m3-primary-container/20 ring-1 ring-m3-primary"
                    : "border-m3-outline-variant hover:bg-m3-surface-container-high"
                }`}
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  className="h-4 w-4 text-m3-primary focus:ring-m3-primary accent-m3-primary"
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleOptionChange(currentQuestion.id, option)}
                />
                <span className="text-body-md font-body-md text-m3-on-surface">{option}</span>
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
                {submitting ? <Icon name="progress_activity" size={16} className="animate-spin" /> : <Icon name="check_circle" size={16} />}
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
      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-8 shadow-m3-soft text-center space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-m3-surface-container-high">
          {result?.passed ? (
            <Icon name="check_circle" size={40} className="text-m3-tertiary" fill />
          ) : (
            <Icon name="cancel" size={40} className="text-m3-error" fill />
          )}
        </div>
        <div>
          <p className="text-headline-lg font-headline-lg text-m3-on-surface">{result?.score ?? 0}%</p>
          <Badge
            className={
              result?.passed
                ? "border-m3-tertiary-fixed-dim bg-m3-tertiary-fixed text-m3-tertiary mt-2"
                : "border-m3-error-fixed-dim bg-m3-error-fixed text-m3-error mt-2"
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
      <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <p className="text-body-md font-body-md text-m3-on-surface">Ответы</p>
        {quiz.questions.map((q, i) => {
          const selected = answers[q.id];
          return (
            <div key={q.id} className="rounded-xl border border-m3-outline-variant p-4 space-y-2">
              <p className="text-body-md font-body-md text-m3-on-surface">{i + 1}. {q.text}</p>
              <div className="space-y-1">
                {q.options.map((option) => {
                  const isSelected = selected === option;
                  return (
                    <div
                      key={option}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-body-md font-body-md ${
                        isSelected ? "bg-m3-primary-container/20 border border-m3-outline-variant" : "bg-m3-surface-container-high"
                      }`}
                    >
                      {isSelected && <span className="text-m3-primary">▶</span>}
                      <span className="text-m3-on-surface">{option}</span>
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
