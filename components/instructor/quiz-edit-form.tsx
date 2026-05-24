"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus, GripVertical, Eye, EyeOff, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { QuestionEditorItem } from "./question-editor-item";
import { readApiData } from "@/lib/api-client";

export interface QuizEditFormProps {
  quiz: {
    id: string;
    title: string;
    passThreshold: number;
    maxAttempts: number;
    questions: { id: string; prompt: string; type: string; points: number; options: unknown; correctAnswer: unknown }[];
  };
  courseId: string;
}

export function QuizEditForm({ quiz, courseId }: QuizEditFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(true);
  const [questions, setQuestions] = useState(quiz.questions);
  const [preview, setPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const dragItem = useRef<number | null>(null);
  const router = useRouter();

  async function handleQuestionUpdate(questionId: string, data: Partial<Parameters<typeof QuestionEditorItem>[0]["question"]>) {
    const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      setQuestions(questions.map(q => q.id === questionId ? { ...q, ...data } : q));
      router.refresh();
    }
  }

  async function handleQuestionDelete(questionId: string) {
    if (!confirm("Удалить этот вопрос?")) return;
    const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions/${questionId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setQuestions(questions.filter(q => q.id !== questionId));
      router.refresh();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title") as string,
      passThreshold: Number(formData.get("passThreshold")),
      maxAttempts: Number(formData.get("maxAttempts")),
    };

    try {
      const response = await fetch(`/api/v1/quizzes/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Тест успешно обновлен!");
        setSuccess(true);
        router.refresh();
      } else {
        const errData = await response.json().catch(() => ({}));
        setMessage(errData.error?.message || "Ошибка при обновлении");
        setSuccess(false);
      }
    } catch {
      setMessage("Ошибка сети");
      setSuccess(false);
    } finally {
      setPending(false);
    }
  }

  // ── Question bank state ─────────────────────────────────────────
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Array<{ id: string; prompt: string; type: string; points: number; quizTitle: string }>>([]);
  const [selectedQs, setSelectedQs] = useState<Set<string>>(new Set());
  const [loadingBank, setLoadingBank] = useState(false);

  // Drag & drop handlers
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (index: number) => {
    const from = dragItem.current;
    if (from === null || from === index) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragItem.current = null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/instructor/quizzes">
          <Button type="button" size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setPreview(!preview); setPreviewAnswers({}); }}
            className="gap-2"
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? "Закрыть предпросмотр" : "Предпросмотр"}
          </Button>
          <span className={cn("text-sm font-medium", success ? "text-emerald-600" : "text-rose-600")}>{message}</span>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Сохраняем..." : "Сохранить настройки"}
          </Button>
        </div>
      </div>

      {preview ? (
        // ── Preview mode ──────────────────────────────────────────
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Предпросмотр: {quiz.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{questions.length} вопросов · порог {quiz.passThreshold}%</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, i) => {
              const options = Array.isArray(q.options) ? q.options as string[] : [];
              return (
                <div key={q.id} className="space-y-3">
                  <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <label
                        key={opt}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                          previewAnswers[q.id] === opt
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <input
                          type="radio"
                          name={`preview-${q.id}`}
                          className="h-4 w-4 text-primary"
                          checked={previewAnswers[q.id] === opt}
                          onChange={() => setPreviewAnswers((a) => ({ ...a, [q.id]: opt }))}
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        // ── Edit mode ─────────────────────────────────────────────
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-lg border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Вопросы теста ({questions.length})</CardTitle>
                <span className="text-xs text-muted-foreground">Перетащите за ≡ чтобы изменить порядок</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Вопросов пока нет. Нажмите «Добавить вопрос» ниже.
                  </div>
                ) : (
                  questions.map((q, i) => (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(i)}
                      className="relative"
                    >
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            if (i > 0) {
                              setQuestions((prev) => {
                                const next = [...prev];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                return next;
                              });
                            }
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (i < questions.length - 1) {
                              setQuestions((prev) => {
                                const next = [...prev];
                                [next[i], next[i + 1]] = [next[i + 1], next[i]];
                                return next;
                              });
                            }
                          }}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          disabled={i === questions.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
                        <span className="text-xs font-medium text-muted-foreground">Вопрос {i + 1}</span>
                      </div>
                      <QuestionEditorItem
                        question={q}
                        onUpdate={handleQuestionUpdate}
                        onDelete={handleQuestionDelete}
                      />
                    </div>
                  ))
                )}
                <Button
                  variant="ghost"
                  type="button"
                  className="w-full border-2 border-dashed rounded-lg h-14 text-muted-foreground hover:text-primary hover:border-primary/50 mt-4"
                  onClick={async () => {
                    const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prompt: "Новый вопрос", type: "SINGLE_CHOICE", points: 1 })
                    });
                    if (res.ok) {
                      const newQ = await readApiData<QuizEditFormProps["quiz"]["questions"][number]>(res);
                      setQuestions([...questions, newQ]);
                      router.refresh();
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить вопрос
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={async () => {
                    setBankOpen(true);
                    setLoadingBank(true);
                    try {
                      const res = await fetch(`/api/v1/courses/${courseId}/questions`);
                      if (res.ok) {
                        const data = await res.json();
                        setBankQuestions(data.data ?? []);
                      }
                    } finally {
                      setLoadingBank(false);
                    }
                  }}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Из банка вопросов
                </Button>
                {/* Question Bank Dialog */}
                <Dialog open={bankOpen} onOpenChange={setBankOpen}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Банк вопросов курса</DialogTitle>
                    </DialogHeader>
                    {loadingBank ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
                    ) : bankQuestions.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Вопросов в курсе пока нет</div>
                    ) : (
                      <div className="space-y-2">
                        {bankQuestions.map((q) => (
                          <label key={q.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30">
                            <input
                              type="checkbox"
                              checked={selectedQs.has(q.id)}
                              onChange={() => {
                                const next = new Set(selectedQs);
                                if (next.has(q.id)) next.delete(q.id);
                                else next.add(q.id);
                                setSelectedQs(next);
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{q.prompt}</p>
                              <p className="text-[10px] text-muted-foreground">{q.type} · {q.points} баллов · из теста «{q.quizTitle}»</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    <DialogFooter>
                      <Button size="sm" variant="secondary" onClick={() => setBankOpen(false)}>Отмена</Button>
                      <Button
                        size="sm"
                        disabled={selectedQs.size === 0}
                        onClick={async () => {
                          const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions/import`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ questionIds: Array.from(selectedQs) }),
                          });
                          if (res.ok) {
                            const newQs = await res.json();
                            const raw = (newQs.data ?? newQs) as Array<{ id: string; prompt: string; type: string; points: number }>;
                            const imported = raw.map((q) => ({ ...q, options: null, correctAnswer: null }));
                            setQuestions([...questions, ...imported]);
                            setSelectedQs(new Set());
                            setBankOpen(false);
                            router.refresh();
                          }
                        }}
                      >
                        Добавить ({selectedQs.size})
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Settings sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-lg border">
              <CardHeader>
                <CardTitle className="text-lg">Настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Название теста</label>
                  <Input name="title" defaultValue={quiz.title} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Порог прохождения (%)</label>
                  <Input name="passThreshold" type="number" min={0} max={100} defaultValue={quiz.passThreshold} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Макс. попыток</label>
                  <Input name="maxAttempts" type="number" min={1} defaultValue={quiz.maxAttempts} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </form>
  );
}
