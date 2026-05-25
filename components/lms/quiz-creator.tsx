"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QUIZ } from "@/lib/constants";
import type { QuizSummary } from "@/types/domain";

interface QuestionForm {
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string | string[];
  points: number;
}

export function QuizCreator({
  lessonId,
  courseId,
  onCreated,
  onCancel,
}: {
  lessonId: string;
  courseId: string;
  onCreated: (quiz: QuizSummary) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [passThreshold, setPassThreshold] = useState<number>(QUIZ.DEFAULT_PASS_THRESHOLD);
  const [maxAttempts, setMaxAttempts] = useState<number>(QUIZ.DEFAULT_MAX_ATTEMPTS);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { type: "single", prompt: "", options: ["", ""], correctAnswer: "0", points: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { type: "single", prompt: "", options: ["", ""], correctAnswer: "0", points: 1 }]);
  };

  const removeQuestion = (i: number) => {
    setQuestions(questions.filter((_, idx) => idx !== i));
  };

  const updateQuestion = (i: number, updates: Partial<QuestionForm>) => {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...updates } : q)));
  };

  const addOption = (qi: number) => {
    setQuestions(questions.map((q, idx) => (idx === qi ? { ...q, options: [...q.options, ""] } : q)));
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(questions.map((q, idx) =>
      idx === qi ? { ...q, options: q.options.map((o, oi2) => (oi2 === oi ? value : o)) } : q
    ));
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Введите название теста"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/course-builder/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          title: title.trim(),
          passThreshold,
          maxAttempts,
          questions: questions.map((q) => ({
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctAnswer: q.correctAnswer,
            points: q.points,
          })),
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        const quiz = payload.data ?? payload;
        toast.success("Тест создан");
        router.refresh();
        onCreated({
          id: quiz.id,
          title: quiz.title,
          passThreshold: quiz.passThreshold,
          maxAttempts: quiz.maxAttempts,
          questionsCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/10 p-4 space-y-4">
      <h4 className="text-sm font-semibold">Создание теста</h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="quizTitle" className="text-xs text-muted-foreground">Название</label>
          <Input id="quizTitle" name="quizTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Тест по теме" />
        </div>
        <div>
          <label htmlFor="passThreshold" className="text-xs text-muted-foreground">Порог (%)</label>
          <Input id="passThreshold" name="passThreshold" type="number" value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="maxAttempts" className="text-xs text-muted-foreground">Попыток</label>
          <Input id="maxAttempts" name="maxAttempts" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Вопрос {qi + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(qi)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={q.prompt}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
              placeholder="Текст вопроса"
            />
            <div className="flex gap-2">
              <select
                className="rounded-lg border px-2 py-1 text-xs"
                value={q.type}
                onChange={(e) => updateQuestion(qi, { type: e.target.value })}
              >
                <option value="single">Один вариант</option>
                <option value="multiple">Несколько вариантов</option>
                <option value="text">Свободный ответ</option>
              </select>
              <input
                type="number"
                className="w-16 rounded-lg border px-2 py-1 text-xs"
                value={q.points}
                onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                placeholder="Баллы"
              />
            </div>
            {q.type === "text" ? (
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  value={Array.isArray(q.correctAnswer) ? q.correctAnswer[0] || "" : q.correctAnswer as string}
                  onChange={(e) => updateQuestion(qi, { correctAnswer: e.target.value })}
                  placeholder="Правильный ответ"
                />
              </div>
            ) : q.type === "multiple" ? (
              <div className="space-y-1">
                {q.options.map((opt, oi) => {
                  const arr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                  const checked = arr.includes(String(oi));
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? arr.filter((v) => v !== String(oi)) : [...arr, String(oi)];
                          updateQuestion(qi, { correctAnswer: next });
                        }}
                        className="shrink-0"
                      />
                      <input
                        className="flex-1 rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Вариант ${oi + 1}`}
                      />
                    </div>
                  );
                })}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => addOption(qi)}>
                  <Plus className="h-3 w-3 mr-1" /> Вариант
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctAnswer === String(oi)}
                      onChange={() => updateQuestion(qi, { correctAnswer: String(oi) })}
                      className="shrink-0"
                    />
                    <input
                      className="flex-1 rounded-lg border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Вариант ${oi + 1}`}
                    />
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => addOption(qi)}>
                  <Plus className="h-3 w-3 mr-1" /> Вариант
                </Button>
              </div>
            )}
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addQuestion} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Добавить вопрос
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Сохранить тест
        </Button>
      </div>
    </div>
  );
}
