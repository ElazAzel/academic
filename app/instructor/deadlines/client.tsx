"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface BlockDeadline {
  id: string;
  targetType: "block" | "module";
  title: string;
  order: number;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  deadline: { id: string; dueAt: string } | null;
}

interface Props {
  cohortId: string;
  cohortName: string;
}

function deadlineToInputValue(dueAt: string) {
  return format(parseISO(dueAt), "yyyy-MM-dd");
}

function inputDateToIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 0, 0).toISOString();
}

export function InstructorDeadlinesClient({ cohortId, cohortName }: Props) {
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<Record<string, string>>({});

  const { data: blocks = [], isLoading } = useQuery<BlockDeadline[]>({
    queryKey: ["instructor-block-deadlines", cohortId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cohorts/${cohortId}/block-deadlines`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  // Initialize dates from existing deadlines once the async data is available.
  useEffect(() => {
    if (blocks.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates((current) => {
      if (Object.keys(current).length > 0) return current;

      const initial: Record<string, string> = {};
      for (const block of blocks) {
        if (block.deadline?.dueAt) {
          initial[block.id] = deadlineToInputValue(block.deadline.dueAt);
        }
      }
      return initial;
    });
  }, [blocks]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const deadlines = Object.entries(dates)
        .filter(([, dueAt]) => dueAt)
        .map(([targetId, dueAt]) => {
          const target = blocks.find((block) => block.id === targetId);
          return {
            ...(target?.targetType === "module" ? { moduleId: targetId } : { blockId: targetId }),
            dueAt: inputDateToIso(dueAt),
          };
        });

      if (deadlines.length === 0) {
        throw new Error("Нет дедлайнов для сохранения");
      }

      const res = await fetch(`/api/v1/cohorts/${cohortId}/block-deadlines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlines }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Ошибка сохранения");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-block-deadlines", cohortId] });
      toast.success(`Дедлайны для потока "${cohortName}" сохранены`);
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-2">Загрузка блоков...</p>;
  }

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Нет блоков в курсе.</p>;
  }

  return (
    <div className="rounded-lg border p-3">
      <h4 className="text-xs font-medium text-muted-foreground mb-2">
        Поток: {cohortName}
      </h4>
      <div className="space-y-1.5">
        {blocks.map((block) => (
          <div key={block.id} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground min-w-[180px]">
              {block.targetType === "module" ? block.moduleTitle : `${block.moduleTitle} - ${block.order}. ${block.title}`}
            </span>
            <input
              type="date"
              value={dates[block.id] ?? ""}
              onChange={(e) =>
                setDates((prev) => ({ ...prev, [block.id]: e.target.value }))
              }
              className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {block.deadline && !dates[block.id] && (
              <span className="text-xs text-muted-foreground">
                {format(parseISO(block.deadline.dueAt), "d MMM", { locale: ru })}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Сохранение..." : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Сохранить
            </>
          )}
        </Button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Рекомендуемые даты, не блокировка
        </p>
      </div>
    </div>
  );
}
