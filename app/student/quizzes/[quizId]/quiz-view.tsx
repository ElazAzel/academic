"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readApiErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";
import type { StudentQuizDetail } from "@/types/domain";

export function QuizView({ quiz }: { quiz: StudentQuizDetail }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function handleOptionChange(questionId: string, option: string) {
    setAnswers((current) => ({ ...current, [questionId]: option }));
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    if (
      Object.keys(answers).length < quiz.questions.length &&
      !confirm("Вы ответили не на все вопросы. Все равно отправить?")
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        router.push(`/student/quizzes/${quiz.id}/result`);
        return;
      }

      toast.error(await readApiErrorMessage(response, "Ошибка при отправке теста"));
    } catch {
      toast.error("Сетевая ошибка при отправке теста");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {quiz.questions.map((question, index) => (
        <Card key={question.id} className="rounded-lg transition-shadow hover:shadow-sm">
          <CardContent className="space-y-3 py-5">
            <p className="text-sm font-medium">
              {index + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                    answers[question.id] === option ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    className="h-4 w-4 text-primary focus:ring-primary"
                    checked={answers[question.id] === option}
                    onChange={() => handleOptionChange(question.id, option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {submitting ? "Отправка..." : "Завершить тест"}
        </Button>
      </div>
    </div>
  );
}
