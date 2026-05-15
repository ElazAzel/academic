"use client";

import { useState } from "react";

export function AssignmentBlockEditor({
  value,
  onChange,
}: {
  value?: { title: string; instructions: string; maxAttempts: number; maxScore: number; deadline?: string };
  onChange: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(value?.title ?? "");
  const [instructions, setInstructions] = useState(value?.instructions ?? "");
  const [maxAttempts, setMaxAttempts] = useState(value?.maxAttempts ?? 3);
  const [maxScore, setMaxScore] = useState(value?.maxScore ?? 100);
  const [deadline, setDeadline] = useState(value?.deadline ?? "");

  const updateParent = () => {
    onChange({ title, instructions, maxAttempts, maxScore, deadline: deadline || undefined });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Название задания</label>
        <input className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={title} onChange={(e) => { setTitle(e.target.value); updateParent(); }} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Инструкция</label>
        <textarea
          className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-1.5 text-sm"
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); updateParent(); }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Макс. попыток</label>
          <input type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={maxAttempts} onChange={(e) => { setMaxAttempts(Number(e.target.value)); updateParent(); }} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Макс. балл</label>
          <input type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={maxScore} onChange={(e) => { setMaxScore(Number(e.target.value)); updateParent(); }} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Дедлайн (опц.)</label>
          <input type="date" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={deadline} onChange={(e) => { setDeadline(e.target.value); updateParent(); }} />
        </div>
      </div>
    </div>
  );
}
