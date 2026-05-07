"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  type: string;
  points: number;
  options: any;
  correctAnswer: any;
}

export function QuestionEditorItem({ question, onUpdate, onDelete }: { 
  question: Question, 
  onUpdate: (id: string, data: any) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [data, setData] = useState(question);

  async function handleSave() {
    setPending(true);
    try {
      await onUpdate(question.id, data);
      setIsExpanded(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border rounded-2xl bg-muted/5 overflow-hidden transition-all">
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/10" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{data.prompt}</p>
          <p className="text-[10px] text-muted-foreground uppercase mt-1">{data.type} · {data.points} БАЛЛ(ОВ)</p>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-white space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Текст вопроса</label>
            <textarea
              className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={data.prompt}
              onChange={(e) => setData({ ...data, prompt: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Баллы</label>
              <Input
                type="number"
                value={data.points}
                onChange={(e) => setData({ ...data, points: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Тип</label>
              <select
                className="w-full h-10 rounded-xl border bg-white px-3 text-sm"
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value })}
              >
                <option value="SINGLE_CHOICE">Один вариант</option>
                <option value="MULTIPLE_CHOICE">Несколько вариантов</option>
                <option value="SHORT_ANSWER">Краткий ответ</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => onDelete(question.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
            <Button size="sm" onClick={handleSave} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Сохранить вопрос
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
