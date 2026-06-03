"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Save, Clock, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getSafeDeadlineActionError } from "@/components/lms/deadline-action-errors";

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

export function DeadlineManager({ cohortId, cohortName }: Props) {
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<Record<string, string>>({});

  const { data: blocks = [], isLoading } = useQuery<BlockDeadline[]>({
    queryKey: ["cohort-block-deadlines", cohortId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cohorts/${cohortId}/block-deadlines`);
      if (!res.ok) throw new Error("Не удалось загрузить дедлайны потока");
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
      queryClient.invalidateQueries({ queryKey: ["cohort-block-deadlines", cohortId] });
      toast.success("Дедлайны сохранены");
    },
    onError: (error) => {
      toast.error(getSafeDeadlineActionError(error));
    },
  });

  // Group blocks by module
  const groupedBlocks = blocks.reduce<Record<string, BlockDeadline[]>>((acc, block) => {
    if (!acc[block.moduleId]) acc[block.moduleId] = [];
    acc[block.moduleId].push(block);
    return acc;
  }, {});

  const sortedModules = Object.entries(groupedBlocks).sort(
    ([, a], [, b]) => a[0].moduleOrder - b[0].moduleOrder,
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Загрузка блоков...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Дедлайны блоков — {cohortName}
        </CardTitle>
        <CardDescription>
          Рекомендуемые даты завершения каждого блока для слушателей этого потока.
          Дедлайны не блокируют доступ — это ориентиры для студентов и напоминания для кураторов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            У курса нет блоков. Сначала создайте блоки в курсе.
          </p>
        ) : (
          sortedModules.map(([moduleId, moduleBlocks]) => (
            <div key={moduleId}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {moduleBlocks[0].moduleTitle}
              </h4>
              <div className="space-y-2">
                {moduleBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium min-w-[200px]">
                      {block.order}. {block.title}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="date"
                        aria-label={`Дата дедлайна для блока ${block.title}`}
                        value={dates[block.id] ?? ""}
                        onChange={(e) =>
                          setDates((prev) => ({ ...prev, [block.id]: e.target.value }))
                        }
                        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {block.deadline && !dates[block.id] && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(block.deadline.dueAt), "d MMM yyyy, HH:mm", { locale: ru })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {blocks.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Сохранение...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить дедлайны
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
              <AlertTriangle className="h-3 w-3" />
              Дедлайны — рекомендованные даты, не блокировка
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
