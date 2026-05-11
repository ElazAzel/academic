"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
}

export function QuizEditForm({ quiz }: QuizEditFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(true);
  const [questions, setQuestions] = useState(quiz.questions);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/instructor/quizzes">
          <Button type="button" size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <span className={success ? "text-emerald-600 text-sm font-medium" : "text-rose-600 text-sm font-medium"}>{message}</span>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Сохраняем..." : "Сохранить настройки"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-2">
            <CardHeader>
              <CardTitle className="text-lg">Вопросы теста ({questions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q) => (
                <QuestionEditorItem 
                  key={q.id} 
                  question={q} 
                  onUpdate={handleQuestionUpdate} 
                  onDelete={handleQuestionDelete} 
                />
              ))}
              <Button variant="ghost" type="button" className="w-full border-2 border-dashed rounded-2xl h-14 text-muted-foreground hover:text-primary hover:border-primary/50" onClick={async () => {
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
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить вопрос
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-2 shadow-sm">
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
    </form>
  );
}
