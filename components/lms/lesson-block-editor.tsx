"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, Video, FileText, HelpCircle, CheckSquare, Star, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ContentBlock, ContentBlockType } from "@/types/domain";

interface BlockItem {
  id: string;
  type: ContentBlockType;
  data: Record<string, unknown>;
}

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  video: "Видео",
  text: "Текст",
  file: "Файл",
  quiz: "Тест",
  assignment: "Задание",
  rating: "Оценка урока",
  curator_question: "Вопрос куратору",
  completion: "Завершение",
};

const BLOCK_ICONS: Record<ContentBlockType, React.ComponentType<{ className?: string }>> = {
  video: Video,
  text: FileText,
  file: FileText,
  quiz: HelpCircle,
  assignment: CheckSquare,
  rating: Star,
  curator_question: MessageSquare,
  completion: CheckCircle,
};

export function LessonBlockEditor({
  lessonId,
  content,
}: {
  lessonId: string;
  content: Record<string, unknown>;
}) {
  const router = useRouter();
  const existingBlocks = (content?.blocks as ContentBlock[]) ?? [];
  const [blocks, setBlocks] = useState<BlockItem[]>(
    existingBlocks.length > 0
      ? existingBlocks.map((b) => ({ id: b.id ?? crypto.randomUUID(), type: b.type as ContentBlockType, data: b.data as Record<string, unknown> }))
      : [{ id: crypto.randomUUID(), type: "text" as ContentBlockType, data: { html: "" } }]
  );
  const [savingBlocks, setSavingBlocks] = useState(false);

  const addBlock = useCallback((type: ContentBlockType, index: number) => {
    const newBlock: BlockItem = { id: crypto.randomUUID(), type, data: {} };
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, newBlock);
      return next;
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBlockData = useCallback((id: string, data: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data } : b)));
  }, []);

  const saveBlocks = useCallback(async () => {
    setSavingBlocks(true);
    try {
      const payload: ContentBlock[] = blocks.map((b) => ({ id: b.id, type: b.type, data: b.data }));
      const res = await fetch(`/api/v1/lessons/${lessonId}/blocks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: payload }),
      });
      if (res.ok) {
        toast.success("Блоки сохранены");
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Ошибка при сохранении блоков");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setSavingBlocks(false);
    }
  }, [blocks, lessonId, router]);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const Icon = BLOCK_ICONS[block.type];
        return (
          <div key={block.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">{BLOCK_LABELS[block.type]}</span>
              <div className="flex-1" />
              <select
                className="h-7 rounded-lg border bg-white px-2 text-xs"
                value={block.type}
                onChange={() => updateBlockData(block.id, {})}
              >
                {Object.entries(BLOCK_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button onClick={() => removeBlock(block.id)} className="p-1 text-muted-foreground hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Block-specific editors */}
            {block.type === "text" && (
              <textarea
                className="w-full min-h-[80px] rounded-xl border bg-muted/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="HTML-содержимое..."
                value={(block.data.html as string) ?? ""}
                onChange={(e) => updateBlockData(block.id, { ...block.data, html: e.target.value })}
              />
            )}

            {block.type === "video" && (
              <input
                className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Ссылка на видео (YouTube embed)"
                value={(block.data.videoUrl as string) ?? ""}
                onChange={(e) => updateBlockData(block.id, { ...block.data, videoUrl: e.target.value })}
              />
            )}

            {block.type === "file" && (
              <input
                className="w-full rounded-xl border bg-muted/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="ID медиафайла"
                value={(block.data.mediaId as string) ?? ""}
                onChange={(e) => updateBlockData(block.id, { ...block.data, mediaId: e.target.value })}
              />
            )}

            {block.type === "quiz" && (
              <div className="text-xs text-muted-foreground">
                {block.data.quizId ? (
                  <span>ID теста: {block.data.quizId as string}</span>
                ) : (
                  <span>Тест будет создан при добавлении</span>
                )}
              </div>
            )}

            {block.type === "assignment" && (
              <div className="text-xs text-muted-foreground">
                {block.data.assignmentId ? (
                  <span>ID задания: {block.data.assignmentId as string}</span>
                ) : (
                  <span>Задание будет создано при добавлении</span>
                )}
              </div>
            )}

            {/* Add block button after each block */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const types: ContentBlockType[] = ["text", "video", "file", "quiz", "assignment", "rating", "curator_question", "completion"];
                  addBlock(types[0], index);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" />
                Добавить блок
              </button>
            </div>
          </div>
        );
      })}

      <Button size="sm" onClick={saveBlocks} disabled={savingBlocks} className="mt-4">
        {savingBlocks ? "Сохранение..." : "Сохранить блоки"}
      </Button>
    </div>
  );
}
