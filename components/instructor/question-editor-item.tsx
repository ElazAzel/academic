import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, ChevronDown, ChevronUp, Loader2, Plus, X } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  type: string;
  points: number;
  options: unknown;
  correctAnswer: unknown;
}

export function QuestionEditorItem({ question, onUpdate, onDelete }: { 
  question: Question, 
  onUpdate: (id: string, data: Partial<Question>) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [data, setData] = useState(question);

  const options = Array.isArray(data.options) ? data.options as string[] : [];
  const correctAnswer = data.correctAnswer as { value?: string; values?: string[] };

  async function handleSave() {
    setPending(true);
    try {
      await onUpdate(question.id, data);
      setIsExpanded(false);
    } finally {
      setPending(false);
    }
  }

  function addOption() {
    const newOptions = [...options, ""];
    setData({ ...data, options: newOptions });
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setData({ ...data, options: newOptions });
  }

  function removeOption(index: number) {
    const newOptions = options.filter((_, i) => i !== index);
    setData({ ...data, options: newOptions });
  }

  function toggleCorrect(value: string) {
    if (data.type === "SINGLE_CHOICE") {
      setData({ ...data, correctAnswer: { value } });
    } else if (data.type === "MULTIPLE_CHOICE") {
      const currentValues = Array.isArray(correctAnswer.values) ? correctAnswer.values : [];
      const newValues = currentValues.includes(value) 
        ? currentValues.filter((v: string) => v !== value)
        : [...currentValues, value];
      setData({ ...data, correctAnswer: { values: newValues } });
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
        <div className="p-4 border-t bg-card space-y-4">
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
              <label className="text-xs font-semibold uppercase text-muted-foreground">Тип</label>
              <select
                className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value, options: (e.target.value === "TEXT" ? [] : options) })}
              >
                <option value="SINGLE_CHOICE">Один вариант</option>
                <option value="MULTIPLE_CHOICE">Несколько вариантов</option>
                <option value="TEXT">Краткий ответ</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Баллы</label>
              <Input
                type="number"
                value={data.points}
                onChange={(e) => setData({ ...data, points: Number(e.target.value) })}
              />
            </div>
          </div>

          {data.type !== "TEXT" && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Варианты ответов</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      (data.type === "SINGLE_CHOICE" ? correctAnswer.value === opt : correctAnswer.values?.includes(opt))
                      ? "bg-primary border-primary text-white" 
                      : "border-muted-foreground/30"
                    }`}
                    onClick={() => toggleCorrect(opt)}
                  >
                    { (data.type === "SINGLE_CHOICE" ? correctAnswer.value === opt : correctAnswer.values?.includes(opt)) && <div className="h-2 w-2 bg-white rounded-full" /> }
                  </div>
                  <Input 
                    value={opt} 
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Вариант ${i + 1}`}
                    className="h-9"
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-rose-600" onClick={() => removeOption(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" className="w-full border-dashed rounded-xl h-10" onClick={addOption}>
                <Plus className="h-3 w-3 mr-2" />
                Добавить вариант
              </Button>
            </div>
          )}

          {data.type === "TEXT" && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Правильный ответ</label>
              <Input 
                value={correctAnswer.value || ""} 
                onChange={(e) => setData({ ...data, correctAnswer: { value: e.target.value } })}
                placeholder="Текст ответа"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
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
