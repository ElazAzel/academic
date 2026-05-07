"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { StudentQuizDetail } from "@/types/domain";

export function QuizView({ quiz }: { quiz: StudentQuizDetail }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleOptionChange = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!confirm("Вы ответили не на все вопросы. Все равно отправить?")) {
        return;
      }
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
      } else {
        const error = await response.json();
        alert(error.message || "Ошибка при отправке теста");
      }
    } catch (err) {
      alert("Сетевая ошибка при отправке теста");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {quiz.questions.map((q, i) => (
        <Card key={q.id} className="rounded-2xl transition-shadow hover:shadow-sm">
          <CardContent className="py-5 space-y-3">
            <p className="text-sm font-medium">
              {i + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <label
                  key={j}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    answers[q.id] === opt ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="h-4 w-4 text-primary focus:ring-primary"
                    checked={answers[q.id] === opt}
                    onChange={() => handleOptionChange(q.id, opt)}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {submitting ? "Отправка..." : "Завершить тест"}
        </Button>
      </div>
    </div>
  );
}
