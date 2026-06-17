import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react";

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
  const [data, setData] = useState(question);
  const isDirty = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const options = Array.isArray(data.options) ? data.options as string[] : [];
  const correctAnswer = data.correctAnswer as { value?: string; values?: string[] };

  // Auto-save: debounce 1.5s after data changes
  useEffect(() => {
    if (!isDirty.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await onUpdate(question.id, data);
        setSaveStatus("saved");
        isDirty.current = false;
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, question.id, onUpdate]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (isDirty.current) {
        const payload = JSON.stringify({ ...question, ...data });
        fetch(`/api/v1/quizzes/${/* quizId */ ""}/questions/${question.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function markDirty() {
    isDirty.current = true;
    setSaveStatus("idle");
  }

  function addOption() {
    const newOptions = [...options, ""];
    setData({ ...data, options: newOptions });
    markDirty();
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setData({ ...data, options: newOptions });
    markDirty();
  }

  function removeOption(index: number) {
    const newOptions = options.filter((_, i) => i !== index);
    setData({ ...data, options: newOptions });
    markDirty();
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
    markDirty();
  }

  return (
    <div className="border rounded-lg bg-muted/5 overflow-hidden transition-all">
      {/* Collapsed preview */}
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/10" onClick={() => setIsExpanded(!isExpanded)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsExpanded(!isExpanded); } }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{data.prompt}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase text-muted-foreground">{data.type === "SINGLE_CHOICE" ? "1 вариант" : data.type === "MULTIPLE_CHOICE" ? "N вариантов" : "Краткий ответ"}</span>
            <span className="text-[10px] text-muted-foreground">· {data.points} балл(ов)</span>
            {data.type !== "TEXT" && options.length > 0 && (
              <span className="text-[10px] text-emerald-700">
                ✓ {data.type === "SINGLE_CHOICE" ? `Вариант ${options.indexOf(correctAnswer.value ?? "") + 1}` : `выбрано ${(correctAnswer.values ?? []).length}`}
              </span>
            )}
          </div>
        </div>
        {saveStatus !== "idle" && (
          <span className="text-[10px]">{saveStatus === "saving" ? "..." : saveStatus === "saved" ? "✓" : "✗"}</span>
        )}
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-card space-y-4">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-xs font-semibold uppercase text-muted-foreground">Текст вопроса</label>
            <textarea
              id="prompt"
              className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              value={data.prompt}
              onChange={(e) => { setData({ ...data, prompt: e.target.value }); markDirty(); }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="type" className="text-xs font-semibold uppercase text-muted-foreground">Тип</label>
              <select
                id="type"
                className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                value={data.type}
                onChange={(e) => { setData({ ...data, type: e.target.value, options: (e.target.value === "TEXT" ? [] : options) }); markDirty(); }}
              >
                <option value="SINGLE_CHOICE">Один вариант</option>
                <option value="MULTIPLE_CHOICE">Несколько вариантов</option>
                <option value="TEXT">Краткий ответ</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="points" className="text-xs font-semibold uppercase text-muted-foreground">Баллы</label>
              <Input
                id="points"
                type="number"
                value={data.points}
                onChange={(e) => { setData({ ...data, points: Number(e.target.value) }); markDirty(); }}
              />
            </div>
          </div>

          {data.type !== "TEXT" && (
            <div className="space-y-3 pt-2">
              <label htmlFor="options" className="text-xs font-semibold uppercase text-muted-foreground">Варианты ответов</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div 
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                      (data.type === "SINGLE_CHOICE" ? correctAnswer.value === opt : correctAnswer.values?.includes(opt))
                      ? "bg-primary border-primary text-white" 
                      : "border-muted-foreground/30"
                    }`}
                    onClick={() => toggleCorrect(opt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCorrect(opt); } }}
                  >
                    { (data.type === "SINGLE_CHOICE" ? correctAnswer.value === opt : correctAnswer.values?.includes(opt)) && <div className="h-2 w-2 bg-white rounded-full" /> }
                  </div>
                  <Input 
                    value={opt} 
                    onChange={(e) => { updateOption(i, e.target.value); }}
                    placeholder={`Вариант ${i + 1}`}
                    className="h-9"
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-rose-600" onClick={() => removeOption(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" className="w-full border-dashed rounded-lg h-10" onClick={addOption}>
                <Plus className="h-3 w-3 mr-2" />
                Добавить вариант
              </Button>
            </div>
          )}

          {data.type === "TEXT" && (
            <div className="space-y-2 pt-2">
              <label htmlFor="correctAnswer" className="text-xs font-semibold uppercase text-muted-foreground">Правильный ответ</label>
              <Input
                id="correctAnswer"
                value={correctAnswer.value || ""} 
                onChange={(e) => { setData({ ...data, correctAnswer: { value: e.target.value } }); markDirty(); }}
                placeholder="Текст ответа"
              />
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => onDelete(question.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && <span className="text-[10px] text-muted-foreground">сохранение...</span>}
              {saveStatus === "saved" && <span className="text-[10px] text-emerald-700">сохранено</span>}
              {saveStatus === "error" && <span className="text-[10px] text-rose-600">ошибка</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
