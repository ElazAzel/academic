"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUIZ } from "@/lib/constants";

interface QuestionInput {
  type: string;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export function QuizBlockEditor({
  value,
  onChange,
}: {
  value?: { title: string; description?: string; passThreshold: number; maxAttempts: number; questions: QuestionInput[] };
  onChange: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(value?.title ?? "");
  const [passThreshold, setPassThreshold] = useState(value?.passThreshold ?? QUIZ.DEFAULT_PASS_THRESHOLD);
  const [maxAttempts, setMaxAttempts] = useState(value?.maxAttempts ?? QUIZ.DEFAULT_MAX_ATTEMPTS);
  const [questions, setQuestions] = useState<QuestionInput[]>(value?.questions ?? []);

  const updateParent = (q: QuestionInput[], t: string, pt: number, ma: number) => {
    onChange({ title: t, passThreshold: pt, maxAttempts: ma, questions: q });
  };

  const addQuestion = () => {
    const qs = [...questions, { type: "single_choice", text: "", options: ["", ""], correctAnswer: "", points: 1, explanation: "" }];
    setQuestions(qs);
    updateParent(qs, title, passThreshold, maxAttempts);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="quizTitle" className="text-xs text-muted-foreground">Название теста</label>
           <input id="quizTitle" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={title} onChange={(e) => { setTitle(e.target.value); updateParent(questions, e.target.value, passThreshold, maxAttempts); }} />
        </div>
        <div>
          <label htmlFor="passThreshold" className="text-xs text-muted-foreground">Порог (%)</label>
          <input id="passThreshold" type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={passThreshold} onChange={(e) => { const v = Number(e.target.value); setPassThreshold(v); updateParent(questions, title, v, maxAttempts); }} />
        </div>
        <div>
          <label htmlFor="maxAttempts" className="text-xs text-muted-foreground">Макс. попыток</label>
          <input id="maxAttempts" type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={maxAttempts} onChange={(e) => { const v = Number(e.target.value); setMaxAttempts(v); updateParent(questions, title, passThreshold, v); }} />
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Вопрос {i + 1}</span>
            <button onClick={() => { const qs = questions.filter((_, j) => j !== i); setQuestions(qs); updateParent(qs, title, passThreshold, maxAttempts); }}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-600" />
            </button>
          </div>
          <input
            className="w-full rounded-lg border bg-muted/20 px-3 py-1.5 text-sm"
            placeholder="Текст вопроса"
            value={q.text}
            onChange={(e) => {
              const qs = questions.map((qq, j) => j === i ? { ...qq, text: e.target.value } : qq);
              setQuestions(qs);
              updateParent(qs, title, passThreshold, maxAttempts);
            }}
          />
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border bg-muted/20 px-3 py-1.5 text-xs"
                placeholder={`Вариант ${oi + 1}`}
                value={opt}
                onChange={(e) => {
                  const qs = questions.map((qq, j) => j === i ? { ...qq, options: qq.options.map((o, k) => k === oi ? e.target.value : o) } : qq);
                  setQuestions(qs);
                  updateParent(qs, title, passThreshold, maxAttempts);
                }}
              />
              <input
                type="radio"
                name={`correct-${i}`}
                checked={q.correctAnswer === opt}
                onChange={() => {
                  const qs = questions.map((qq, j) => j === i ? { ...qq, correctAnswer: opt } : qq);
                  setQuestions(qs);
                  updateParent(qs, title, passThreshold, maxAttempts);
                }}
                className="h-3.5 w-3.5"
              />
            </div>
          ))}
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
            const qs = questions.map((qq, j) => j === i ? { ...qq, options: [...qq.options, ""] } : qq);
            setQuestions(qs);
            updateParent(qs, title, passThreshold, maxAttempts);
          }}>
            <Plus className="h-3 w-3 mr-1" /> Вариант
          </Button>
        </div>
      ))}

      <Button size="sm" variant="secondary" onClick={addQuestion}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Добавить вопрос
      </Button>
    </div>
  );
}
