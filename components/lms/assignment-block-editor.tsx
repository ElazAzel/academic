"use client";

import { useState } from "react";
import { ASSIGNMENT } from "@/lib/constants";
import { RichTextEditor } from "@/components/lms/rich-text-editor";

export function AssignmentBlockEditor({
  value,
  onChange,
}: {
  value?: { title: string; instructions: string; maxAttempts: number; maxScore: number; deadline?: string };
  onChange: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(value?.title ?? "");
  const [instructions, setInstructions] = useState(value?.instructions ?? "");
  const [maxAttempts, setMaxAttempts] = useState(value?.maxAttempts ?? ASSIGNMENT.DEFAULT_MAX_ATTEMPTS);
  const [maxScore, setMaxScore] = useState(value?.maxScore ?? ASSIGNMENT.DEFAULT_MAX_SCORE);
  const [deadline, setDeadline] = useState(value?.deadline ?? "");

  const updateParent = () => {
    onChange({ title, instructions, maxAttempts, maxScore, deadline: deadline || undefined });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="assignmentTitle" className="text-xs text-muted-foreground">Название задания</label>
        <input id="assignmentTitle" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={title} onChange={(e) => { setTitle(e.target.value); updateParent(); }} />
      </div>
      <div>
        <span className="text-xs text-muted-foreground">Инструкция</span>
        <RichTextEditor
          value={instructions}
          onChange={(html) => { setInstructions(html); updateParent(); }}
          placeholder="Инструкция к заданию..."
          minHeight="100px"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="maxAttempts" className="text-xs text-muted-foreground">Макс. попыток</label>
          <input id="maxAttempts" type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={maxAttempts} onChange={(e) => { setMaxAttempts(Number(e.target.value)); updateParent(); }} />
        </div>
        <div>
          <label htmlFor="maxScore" className="text-xs text-muted-foreground">Макс. балл</label>
          <input id="maxScore" type="number" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={maxScore} onChange={(e) => { setMaxScore(Number(e.target.value)); updateParent(); }} />
        </div>
        <div>
          <label htmlFor="deadline" className="text-xs text-muted-foreground">Дедлайн (опц.)</label>
          <input id="deadline" type="date" className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm" value={deadline} onChange={(e) => { setDeadline(e.target.value); updateParent(); }} />
        </div>
      </div>
    </div>
  );
}
