"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface AssignmentEditFormProps {
  assignment: {
    id: string;
    title: string;
    instructions: string;
    maxScore: number;
    maxAttempts: number;
  };
}

export function AssignmentEditForm({ assignment }: AssignmentEditFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(true);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title") as string,
      instructions: formData.get("instructions") as string,
      maxScore: Number(formData.get("maxScore")),
      maxAttempts: Number(formData.get("maxAttempts")),
    };

    try {
      const response = await fetch(`/api/v1/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage("Задание успешно обновлено!");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/instructor/assignments">
          <Button type="button" size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <span className={success ? "text-emerald-600 text-sm font-medium" : "text-rose-600 text-sm font-medium"}>{message}</span>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Сохраняем..." : "Сохранить задание"}
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-2">
        <CardHeader>
          <CardTitle className="text-lg">Основные параметры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Название задания *</label>
            <Input name="title" defaultValue={assignment.title} required minLength={3} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Инструкции (Markdown)</label>
            <textarea
              name="instructions"
              defaultValue={assignment.instructions}
              required
              className="w-full min-h-[300px] rounded-2xl border bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Максимальный балл</label>
              <Input name="maxScore" type="number" min={1} defaultValue={assignment.maxScore} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Макс. попыток</label>
              <Input name="maxAttempts" type="number" min={1} defaultValue={assignment.maxAttempts} />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
