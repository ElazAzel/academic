"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Loader2, Download, Smile } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageAction, getConversation, markAsRead, getUploadUrlForFile } from "@/server/actions/chat";
import { getSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";

const COMMON_EMOJIS = ["😊", "👍", "❤️", "🎉", "🔥", "👏", "😄", "🚀", "⭐", "🙏", "💪", "😎", "✨"];

interface ChatMessage {
  id: string;
  text: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  senderId: string;
  senderName: string;
  createdAt: string;
  isMine: boolean;
}

export function ChatPanel({
  lessonId,
  replyLessonId,
  curatorId,
  studentId,
}: {
  lessonId?: string;
  replyLessonId?: string;
  curatorId?: string;
  studentId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["chat", studentId, lessonId], [studentId, lessonId]);
  const messageLessonId = lessonId ?? replyLessonId;
  const receiverId = curatorId ?? studentId;
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);

  const { data: messages = [] } = useQuery({
    queryKey,
    queryFn: () => getConversation(studentId, lessonId),
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelKey = `${studentId}-${lessonId ?? "all"}`;
    const invalidateChat = () => {
      queryClient.invalidateQueries({ queryKey });
    };

    const incomingChannel = supabase
      .channel(`chat-messages-in-${channelKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${studentId}`,
        },
        invalidateChat
      )
      .subscribe();

    const outgoingChannel = supabase
      .channel(`chat-messages-out-${channelKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${studentId}`,
        },
        invalidateChat
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(outgoingChannel);
    };
  }, [studentId, lessonId, queryClient, queryKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unreadIds = messages.filter((m) => !m.isMine).map((m) => m.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (formData: FormData) => sendMessageAction(formData),
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChatMessage[]>(queryKey);

      // Оптимистичное добавление сообщения
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        text: formData.get("text") as string,
        attachmentUrl: formData.get("attachmentUrl") as string | null,
        attachmentType: formData.get("attachmentType") as string | null,
        lessonId: (formData.get("lessonId") as string | null) ?? null,
        lessonTitle: null,
        senderId: "optimistic",
        senderName: "Вы",
        createdAt: new Date().toISOString(),
        isMine: true,
      };

      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (_err, _formData, context) => {
      isSendingRef.current = false;
      // Keep optimistic message visible with error state (has retry button)
      // Don't restore text to input — user sees retry option in bubble
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Не удалось отправить сообщение");
    },
    onSettled: () => {
      isSendingRef.current = false;
      queryClient.invalidateQueries({ queryKey });
    },
  });

  function insertEmoji(emoji: string) {
    const input = document.querySelector<HTMLInputElement>('input[name="text"]');
    if (input) {
      const start = input.selectionStart ?? text.length;
      const end = input.selectionEnd ?? text.length;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      requestAnimationFrame(() => {
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        input.focus();
      });
    } else {
      setText(text + emoji);
    }
    setShowEmojiPicker(false);
  }

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSendingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    isSendingRef.current = true;

    // Clear input FIRST — before mutation
    const savedText = trimmed;
    setText("");

    const formData = new FormData();
    formData.set("text", savedText);
    if (messageLessonId) formData.set("lessonId", messageLessonId);
    formData.set("receiverId", receiverId);
    sendMutation.mutate(formData);
  }

  function handleDownload() {
    const date = new Date().toLocaleDateString("ru-RU");
    const lines: string[] = [
      "Чат с куратором",
      `Дата: ${date}`,
      "---",
      ...messages.map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
        const sender = m.isMine ? "Вы" : m.senderName || "Куратор";
        const context = m.lessonTitle ? ` (${m.lessonTitle})` : "";
        return `[${time}]${context} ${sender}: ${m.text ?? ""}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${date.replace(/\./g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileUpload(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 15MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type)) {
      toast.error("Формат не поддерживается. Разрешены: PNG, JPEG, GIF, WebP, PDF, DOC, DOCX, TXT");
      return;
    }
    setUploading(true);
    try {
      const { url, publicUrl } = await getUploadUrlForFile(file.name, file.type);
      const uploadResponse = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }
      const formData = new FormData();
      formData.set("attachmentUrl", publicUrl);
      formData.set("attachmentType", file.type);
      if (messageLessonId) formData.set("lessonId", messageLessonId);
      formData.set("receiverId", receiverId);
      sendMutation.mutate(formData);
    } catch {
      // Fallback: для маленьких изображений используем base64
      if (file.type.startsWith("image/") && file.size < 500 * 1024) {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const formData = new FormData();
            formData.set("text", `[Изображение]`);
            formData.set("attachmentUrl", reader.result as string);
            formData.set("attachmentType", file.type);
            if (messageLessonId) formData.set("lessonId", messageLessonId);
            formData.set("receiverId", receiverId);
            sendMutation.mutate(formData);
          };
          reader.readAsDataURL(file);
          return;
        } catch {
          // ignore, fall through to error
        }
      }
      toast.error("Ошибка загрузки файла. Хранилище недоступно.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-card">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-sm font-medium">Чат с куратором</span>
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={handleDownload} aria-label="Скачать историю">
            <Download className="h-4 w-4 mr-1" />
            Скачать историю
          </Button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-auto px-4 pb-3 max-h-[400px] min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Начните диалог с куратором</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.text && <p className="text-sm">{m.text}</p>}
              {m.attachmentUrl && m.attachmentType?.includes("image") ? (
                <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.attachmentUrl}
                  alt="Вложение"
                  className="mt-2 max-w-full rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                </>
              ) : m.attachmentUrl ? (
                <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`block mt-1 text-xs underline ${m.isMine ? "text-primary-foreground/80" : "text-primary"}`}>
                  📎 {m.attachmentType?.includes("pdf") ? "PDF"
                    : m.attachmentType?.includes("word") || m.attachmentType?.includes("document") ? "Документ"
                    : "Файл"}
                </a>
              ) : null}
              {m.lessonTitle && (
                <p className={`mt-1 text-[10px] ${m.isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  Контекст урока: {m.lessonTitle}
                </p>
              )}
              <p className={`text-[10px] mt-1 ${m.isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                {m.id.startsWith("optimistic-") && sendMutation.isPending && " · отправляется..."}
                {m.id.startsWith("optimistic-") && sendMutation.isError && (
                  <span className="text-destructive"> · ошибка</span>
                )}
              </p>
              {m.id.startsWith("optimistic-") && sendMutation.isError && (
                <button
                  onClick={() => {
                    // Повторная отправка последнего неудачного сообщения
                    const formData = new FormData();
                    formData.set("text", m.text ?? "");
                    if (messageLessonId) formData.set("lessonId", messageLessonId);
                    formData.set("receiverId", receiverId);
                    sendMutation.mutate(formData);
                  }}
                  className="mt-1 text-[10px] text-destructive hover:underline"
                >
                  Повторить
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3">
        {showEmojiPicker && (
          <div className="flex flex-wrap gap-1 mb-2 p-2 border rounded-lg bg-background">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-lg hover:bg-muted rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Прикрепить файл">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} aria-label="Выбрать эмодзи">
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={sendMutation.isPending || (!text.trim())}>
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
