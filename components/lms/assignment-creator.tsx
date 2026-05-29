"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ASSIGNMENT } from "@/lib/constants";
import type { AssignmentSummary } from "@/types/domain";

export function AssignmentCreator({
  lessonId,
  courseId,
  onCreated,
  onCancel,
}: {
  lessonId: string;
  courseId: string;
  onCreated: (assignment: AssignmentSummary) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxAttempts, setMaxAttempts] = useState<number>(ASSIGNMENT.DEFAULT_MAX_ATTEMPTS);
  const [maxScore, setMaxScore] = useState<number>(ASSIGNMENT.DEFAULT_MAX_SCORE);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) { toast.error("Введите название задания"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/course-builder/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          courseId,
          title: title.trim(),
          instructions: instructions.trim(),
          maxAttempts,
          maxScore,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        const assignment = payload.data ?? payload;
        toast.success("Задание создано");
        router.refresh();
        onCreated({
          id: assignment.id,
          title: assignment.title,
          deadline: assignment.deadline,
          maxAttempts: assignment.maxAttempts,
          submissionStatus: null,
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
      <h4 className="text-sm font-semibold">Создание задания</h4>
      <div>
        <label htmlFor="assignmentCreatorTitle" className="text-xs text-muted-foreground">Название</label>
        <Input id="assignmentCreatorTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Финальное задание" />
      </div>
      <div>
        <label htmlFor="assignmentCreatorInstructions" className="text-xs text-muted-foreground">Инструкция</label>
        <textarea
          id="assignmentCreatorInstructions"
          className="w-full min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Опишите задание подробно..."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="assignmentCreatorMaxAttempts" className="text-xs text-muted-foreground">Макс. попыток</label>
          <Input id="assignmentCreatorMaxAttempts" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
        </div>
        <div>
          <label htmlFor="assignmentCreatorMaxScore" className="text-xs text-muted-foreground">Макс. балл</label>
          <Input id="assignmentCreatorMaxScore" type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Создать задание
        </Button>
      </div>
    </div>
  );
}
