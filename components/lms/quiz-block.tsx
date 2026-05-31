"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import type { StudentQuizDetail } from "@/types/domain";

type QuizPhase = "idle" | "active" | "result" | "review";

function isMultiChoice(type: string): boolean {
  return type === "MULTIPLE_CHOICE";
}

function hasAnswer(answer: string | string[] | undefined): boolean {
  if (!answer) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== "";
}

export function QuizBlock({ quiz }: { quiz: StudentQuizDetail }) {
  const router = useRouter();
  const [phase, setPhase] = useState<QuizPhase>("idle");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const questionsCount = quiz.questions.length;
  const answeredTotal = quiz.questions.filter((q) => hasAnswer(answers[q.id])).length;
  const progressPercent = questionsCount === 0 ? 0 : Math.round((answeredTotal / questionsCount) * 100);

  const handleOptionChange = useCallback((questionId: string, option: string, type: string) => {
    if (isMultiChoice(type)) {
      setAnswers((prev) => {
        const currentVal = prev[questionId];
        const arr = Array.isArray(currentVal) ? currentVal : [];
        const next = arr.includes(option) ? arr.filter((v) => v !== option) : [...arr, option];
        return { ...prev, [questionId]: next };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [questionId]: option }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (answeredTotal < questionsCount) {
      if (!confirm("Вы ответили не на все вопросы. Всё равно отправить?")) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ score: data.grading?.score ?? data.score, passed: data.passed });
        setPhase("result");
        if (data.xp && data.xp.earned > 0) {
          toast.success(`Вы заработали +${data.xp.earned} XP! Всего: ${data.xp.xp} XP`);
        }
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
  }, [quiz.id, answers, submitting, router, questionsCount, answeredTotal]);

  // ── Idle / before start ────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-md font-body-md text-m3-on-surface">{quiz.title}</p>
            <p className="text-label-sm font-label-sm text-m3-on-surface-variant mt-0.5">{quiz.questionsCount} вопросов · порог {quiz.passThreshold}% · {quiz.maxAttempts} попытки</p>
          </div>
          <StatusBadge status="upcoming" label="Тест" />
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
      <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        {/* Question numbers */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-m3-outline-variant overflow-x-auto">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Открыть вопрос ${i + 1}`}
              aria-pressed={i === currentIndex}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-label-sm font-label-sm transition-colors ${
                i === currentIndex
                  ? "bg-m3-primary text-m3-on-primary"
                  : hasAnswer(answers[q.id])
                  ? "bg-m3-primary-container text-m3-primary"
                  : "bg-m3-surface-container-high text-m3-on-surface-variant"
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <CardContent className="space-y-4 py-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-label-sm font-label-sm text-m3-on-surface-variant">
            <span>Вопрос {currentIndex + 1} из {quiz.questions.length}</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1" />

          {/* Question */}
          <p className="text-body-md font-body-md text-m3-on-surface">
            {currentQuestion.text}
            {isMultiChoice(currentQuestion.type) && (
              <span className="ml-2 text-label-sm font-label-sm text-m3-on-surface-variant">
                (можно выбрать несколько)
              </span>
            )}
          </p>

          {/* Options */}
          <div className="space-y-2">
            {currentQuestion.options.map((option) => {
              const multi = isMultiChoice(currentQuestion.type);
              const selected = multi
                ? Array.isArray(answers[currentQuestion.id]) && (answers[currentQuestion.id] as string[]).includes(option)
                : answers[currentQuestion.id] === option;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selected
                      ? "border-m3-primary bg-m3-primary-container/20 ring-1 ring-m3-primary"
                      : "border-m3-outline-variant hover:bg-m3-surface-container-high"
                  }`}
                >
                  <input
                    type={multi ? "checkbox" : "radio"}
                    name={currentQuestion.id}
                    className="h-4 w-4 text-m3-primary focus:ring-m3-primary accent-m3-primary"
                    checked={selected}
                    onChange={() => handleOptionChange(currentQuestion.id, option, currentQuestion.type)}
                  />
                  <span className="break-words text-body-md font-body-md text-m3-on-surface">{option}</span>
                </label>
              );
            })}
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
                {submitting ? "Отправка…" : "Завершить тест"}
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
      <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-8 shadow-m3-soft text-center space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-m3-surface-container-high">
          {result?.passed ? (
            <Icon name="check_circle" size={40} className="text-m3-tertiary" fill />
          ) : (
            <Icon name="cancel" size={40} className="text-m3-error" fill />
          )}
        </div>
        <div>
          <p className="text-headline-lg font-headline-lg text-m3-on-surface">{result?.score ?? 0}%</p>
          <StatusBadge status={result?.passed ? "passed" : "failed"} className="mt-2" />
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
      <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 shadow-m3-soft space-y-4">
        <p className="text-body-md font-body-md text-m3-on-surface">Ответы</p>
        {quiz.questions.map((q, i) => {
          const selectedVal = answers[q.id];
          const selectedArr = isMultiChoice(q.type)
            ? (Array.isArray(selectedVal) ? selectedVal : [])
            : [selectedVal];
          return (
            <div key={q.id} className="rounded-lg border border-m3-outline-variant p-4 space-y-2">
              <p className="text-body-md font-body-md text-m3-on-surface">{i + 1}. {q.text}</p>
              <div className="space-y-1">
                {q.options.map((option) => {
                  const isSelected = selectedArr.includes(option);
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
