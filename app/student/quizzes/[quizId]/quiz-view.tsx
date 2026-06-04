"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readApiData, readApiErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
import type { StudentQuizDetail } from "@/types/domain";

type QuizAttemptResponse = {
  id?: string;
};

function isMultiChoice(type: string): boolean {
  return type === "MULTIPLE_CHOICE";
}

function hasAnswer(answer: string | string[] | undefined): boolean {
  if (!answer) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== "";
}

export function QuizView({ quiz }: { quiz: StudentQuizDetail }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleOptionChange(questionId: string, option: string, type: string) {
    if (isMultiChoice(type)) {
      setAnswers((current) => {
        const currentVal = current[questionId];
        const arr = Array.isArray(currentVal) ? currentVal : [];
        const next = arr.includes(option)
          ? arr.filter((v) => v !== option)
          : [...arr, option];
        return { ...current, [questionId]: next };
      });
    } else {
      setAnswers((current) => ({ ...current, [questionId]: option }));
    }
  }

  function answeredCount(): number {
    return quiz.questions.filter((q) => hasAnswer(answers[q.id])).length;
  }

  async function handleSubmit() {
    if (submitting) return;

    if (answeredCount() < quiz.questions.length && !confirm("Вы ответили не на все вопросы. Все равно отправить?")) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        const attempt = await readApiData<QuizAttemptResponse>(response);
        const attemptQuery = attempt.id ? `?attemptId=${encodeURIComponent(attempt.id)}` : "";
        router.push(`/student/quizzes/${quiz.id}/result${attemptQuery}`);
        return;
      }

      toast.error(await readApiErrorMessage(response, "Ошибка при отправке теста"));
    } catch {
      toast.error("Сетевая ошибка при отправке теста");
    } finally {
      setSubmitting(false);
    }
  }

  function isSelected(questionId: string, option: string): boolean {
    const val = answers[questionId];
    if (Array.isArray(val)) return val.includes(option);
    return val === option;
  }

  return (
    <div className="space-y-4">
      {quiz.questions.map((question, index) => {
        const multi = isMultiChoice(question.type);
        return (
          <Card key={question.id} className="rounded-lg transition-shadow hover:shadow-sm">
            <CardContent className="space-y-3 py-5">
              <p className="text-sm font-medium">
                {index + 1}. {question.text}
                {multi && <span className="ml-2 text-xs text-muted-foreground">(можно выбрать несколько)</span>}
              </p>
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      isSelected(question.id, option) ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={question.id}
                      className="h-4 w-4 text-primary focus:ring-primary"
                      checked={isSelected(question.id, option)}
                      onChange={() => handleOptionChange(question.id, option, question.type)}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {submitting ? "Отправка..." : "Завершить тест"}
        </Button>
      </div>
    </div>
  );
}
