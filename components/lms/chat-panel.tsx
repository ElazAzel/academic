"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessageAction, getConversation, markAsRead } from "@/server/actions/chat";
import { toast } from "sonner";
import { compressImage, formatBytes } from "@/lib/client-image-compress";

const COMMON_EMOJIS = ["😊", "👍", "❤️", "🎉", "🔥", "👏", "😄", "🚀", "⭐", "🙏", "💪", "😎", "✨"];
const MAX_CHAT_TEXT_LENGTH = 10_000;

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
  readAt: string | null;
  isMine: boolean;
  replyToId: string | null;
  replyToText: string | null;
  replyToSenderName: string | null;
}

export function ChatPanel({
  lessonId,
  replyLessonId,
  curatorId,
  studentId,
  conversationTitle = "Чат с куратором",
  emptyState = "Начните диалог с куратором",
  historyTitle = "Чат с куратором",
  otherParticipantName = "Куратор",
  showResponseState = false,
  fullHeight = false,
}: {
  lessonId?: string;
  replyLessonId?: string;
  curatorId?: string;
  studentId: string;
  conversationTitle?: string;
  emptyState?: string;
  historyTitle?: string;
  otherParticipantName?: string;
  showResponseState?: boolean;
  fullHeight?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["chat", studentId, lessonId], [studentId, lessonId]);
  const messageLessonId = lessonId ?? replyLessonId;
  const receiverId = curatorId ?? studentId;
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToPreview, setReplyToPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isSendingRef = useRef(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getConversation(studentId, lessonId),
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Note: Supabase Realtime subscription was removed because the app uses
  // NextAuth (not Supabase Auth). Client-side realtime with the anon key
  // would have no RLS enforcement. 30s polling via server actions is the
  // secure fallback — optimistic updates hide the latency for sent messages.

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const unreadIds = messages.filter((m) => !m.isMine && !m.readAt).map((m) => m.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  }, [messages]);

  const responseStateByMessageId = useMemo(() => {
    const states = new Map<string, "answered" | "awaiting_reply">();
    messages.forEach((message, index) => {
      if (message.isMine) return;
      const hasLaterReply = messages.slice(index + 1).some((candidate) => candidate.isMine);
      states.set(message.id, hasLaterReply ? "answered" : "awaiting_reply");
    });
    return states;
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (formData: FormData) => sendMessageAction(formData),
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChatMessage[]>(queryKey);

      // Оптимистичное добавление сообщения
      const replyToId = formData.get("replyToId") as string | null;
      // Find parent message text for optimistic preview
      const prevMessages = queryClient.getQueryData<ChatMessage[]>(queryKey) ?? [];
      const parentMsg = replyToId ? prevMessages.find((m) => m.id === replyToId) : null;
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
        readAt: null,
        isMine: true,
        replyToId: replyToId,
        replyToText: parentMsg?.text
          ? parentMsg.text.slice(0, 100) + (parentMsg.text.length > 100 ? "…" : "")
          : parentMsg?.attachmentUrl ? "📎 Вложение" : null,
        replyToSenderName: parentMsg ? (parentMsg.senderName ?? "Пользователь") : null,
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

  function handleReply(message: ChatMessage) {
    setReplyToId(message.id);
    setReplyToPreview(message.text ? message.text.slice(0, 80) + (message.text.length > 80 ? "…" : "") : (message.attachmentUrl ? "📎 Вложение" : "Сообщение"));
  }

  function cancelReply() {
    setReplyToId(null);
    setReplyToPreview(null);
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
    if (replyToId) formData.set("replyToId", replyToId);
    sendMutation.mutate(formData);
    cancelReply();
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function handleDownload() {
    const date = new Date().toLocaleDateString("ru-RU");
    const lines: string[] = [
      historyTitle,
      `Дата: ${date}`,
      "---",
      ...messages.map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
        const sender = m.isMine ? "Вы" : m.senderName || otherParticipantName;
        const context = m.lessonTitle ? ` (${m.lessonTitle})` : "";
        return `[${time}]${context} ${sender}: ${m.text ?? ""}`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${date.replace(/\./g, "-")}.txt`;
      a.click();
    } finally {
      // Ensure cleanup even if click fails (e.g. popup blocked)
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  async function handleFileUpload(file: File) {
    const ALLOWED = new Set([
      "image/png", "image/jpeg", "image/gif", "image/webp",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain",
    ]);
    if (!ALLOWED.has(file.type)) {
      toast.error("Формат не поддерживается. Разрешены: PNG, JPEG, GIF, WebP, PDF, DOC, DOCX, TXT");
      return;
    }

    setUploading(true);
    try {
      // Compress image before upload
      const result = await compressImage(file);

      if (result.finalSize > 15 * 1024 * 1024) {
        toast.error(`Файл слишком большой после сжатия. Максимум 15MB (${formatBytes(result.finalSize)})`);
        return;
      }

      if (result.compressed) {
        const saved = result.originalSize - result.finalSize;
        const pct = Math.round((saved / result.originalSize) * 100);
        console.log(
          `[Compress] ${file.name}: ${formatBytes(result.originalSize)} → ${formatBytes(result.finalSize)} (−${pct}%)`,
        );
      }

      const body = new FormData();
      body.append("file", result.file);
      const res = await fetch("/api/v1/chat/upload", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const { publicUrl, attachmentType } = await res.json();
      const formData = new FormData();
      formData.set("attachmentUrl", publicUrl);
      formData.set("attachmentType", attachmentType ?? result.file.type);
      if (messageLessonId) formData.set("lessonId", messageLessonId);
      formData.set("receiverId", receiverId);
      sendMutation.mutate(formData);
    } catch {
      toast.error("Ошибка загрузки файла. Хранилище недоступно.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`flex flex-col rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft ${fullHeight ? 'h-full' : 'h-[520px]'}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <span className="text-label-lg font-label-lg text-m3-on-surface">{conversationTitle}</span>
        {messages.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={handleDownload} aria-label="Скачать историю">
            <Icon name="download" size={16} className="mr-1" />
            Скачать историю
          </Button>
        )}
      </div>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
        {isLoading && (
          <div className="flex flex-col gap-3 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className={`h-12 w-3/5 animate-pulse rounded-2xl bg-m3-surface-container-high ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`} />
              </div>
            ))}
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-body-md font-body-md text-m3-on-surface-variant py-8">{emptyState}</p>
        )}
        {messages.map((m, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const next = index < messages.length - 1 ? messages[index + 1] : null;
          const isFirstInGroup = !prev || prev.isMine !== m.isMine;
          const isLastInGroup = !next || next.isMine !== m.isMine;
          const isSingle = isFirstInGroup && isLastInGroup;

          let roundClasses = "";
          if (isSingle) {
            roundClasses = "rounded-2xl";
          } else if (m.isMine) {
            if (isFirstInGroup) roundClasses = "rounded-2xl rounded-br-sm";
            else if (isLastInGroup) roundClasses = "rounded-2xl rounded-tr-sm";
            else roundClasses = "rounded-2xl rounded-r-sm rounded-l-2xl";
          } else {
            if (isFirstInGroup) roundClasses = "rounded-2xl rounded-bl-sm";
            else if (isLastInGroup) roundClasses = "rounded-2xl rounded-tl-sm";
            else roundClasses = "rounded-2xl rounded-l-sm rounded-r-2xl";
          }

          return (
            <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 ${roundClasses} ${m.isMine ? "bg-m3-primary text-m3-on-primary" : "bg-m3-surface-container-high"}`}>
                {(isFirstInGroup || m.lessonTitle) && m.lessonTitle && (
                  <p className={`text-label-sm font-label-sm mb-1 ${m.isMine ? "text-m3-on-primary/70" : "text-m3-on-surface-variant"}`}>
                    {m.isMine ? "" : "📚 "}{m.lessonTitle}
                  </p>
                )}
                {m.replyToId && m.replyToText && (
                  <div className={`mb-1.5 px-2.5 py-1.5 rounded-md border-l-2 text-label-sm font-label-sm ${
                    m.isMine
                      ? "border-m3-on-primary/40 bg-m3-on-primary/10 text-m3-on-primary/80"
                      : "border-m3-outline bg-m3-surface-container-highest text-m3-on-surface-variant"
                  }`}>
                    <span className="font-medium">{m.replyToSenderName ?? "Пользователь"}: </span>
                    <span className="line-clamp-1">{m.replyToText}</span>
                  </div>
                )}
                {m.text && <p className="whitespace-pre-wrap break-words text-body-md font-body-md [overflow-wrap:anywhere]">{m.text}</p>}
                {m.attachmentUrl && m.attachmentType?.includes("image") ? (
                  <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.attachmentUrl}
                    alt="Вложение"
                    className="mt-2 max-w-full rounded-lg border border-m3-outline-variant"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  </>
                ) : m.attachmentUrl ? (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`block mt-1 text-label-sm font-label-sm underline ${m.isMine ? "text-m3-on-primary/80" : "text-m3-primary"}`}>
                    📎 {m.attachmentType?.includes("pdf") ? "PDF"
                      : m.attachmentType?.includes("word") || m.attachmentType?.includes("document") ? "Документ"
                      : "Файл"}
                  </a>
                ) : null}
                {isLastInGroup && (
                  <div className={`flex items-center gap-2 mt-1 ${m.isMine ? "justify-end" : "justify-start"}`}>
                    <p className={`text-label-sm font-label-sm ${m.isMine ? "text-m3-on-primary/60" : "text-m3-on-surface-variant"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                      {m.isMine && !m.id.startsWith("optimistic-") && (m.readAt ? " · прочитано" : " · отправлено")}
                      {m.id.startsWith("optimistic-") && sendMutation.isPending && " · отправляется..."}
                      {m.id.startsWith("optimistic-") && sendMutation.isError && (
                        <span className="text-m3-error"> · ошибка</span>
                      )}
                    </p>
                  </div>
                )}
                {!m.isMine && !m.id.startsWith("optimistic-") && (
                  <div className="mt-1 text-left">
                    <button
                      type="button"
                      onClick={() => handleReply(m)}
                      className="text-label-sm font-label-sm text-m3-primary hover:underline"
                    >
                      Ответить
                    </button>
                  </div>
                )}
                {showResponseState && !m.isMine && responseStateByMessageId.get(m.id) && (
                  <p className={`mt-1 text-label-sm font-label-sm ${
                    responseStateByMessageId.get(m.id) === "answered" ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {responseStateByMessageId.get(m.id) === "answered" ? "Ответ отправлен" : "Ожидает ответа"}
                  </p>
                )}
                {m.id.startsWith("optimistic-") && sendMutation.isError && (
                  <button
                    onClick={() => {
                      const formData = new FormData();
                      formData.set("text", m.text ?? "");
                      if (messageLessonId) formData.set("lessonId", messageLessonId);
                      formData.set("receiverId", receiverId);
                      sendMutation.mutate(formData);
                    }}
                    className="mt-1 text-label-sm font-label-sm text-m3-error hover:underline"
                  >
                    Повторить
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-m3-outline-variant p-3 shrink-0">
        {replyToPreview && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-m3-surface-container-high border border-m3-outline-variant">
            <Icon name="reply" size={16} className="shrink-0 text-m3-primary" />
            <span className="flex-1 text-label-sm font-label-sm text-m3-on-surface-variant truncate">
              {replyToPreview}
            </span>
            <button type="button" onClick={cancelReply} className="shrink-0 text-m3-on-surface-variant hover:text-m3-on-surface" aria-label="Отменить ответ">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {showEmojiPicker && (
          <div className="flex flex-wrap gap-1 mb-2 p-2 border border-m3-outline-variant rounded-lg bg-m3-surface-container-high">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="text-lg hover:bg-m3-surface-container-high rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <form ref={formRef} onSubmit={handleSend} className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Прикрепить файл">
            {uploading ? <Icon name="progress_activity" size={16} className="animate-spin" /> : <Icon name="attach_file" size={16} />}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} aria-label="Выбрать эмодзи">
            <Icon name="emoji_emotions" size={16} />
          </Button>
          <div className="min-w-0 flex-1">
          <Textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            maxLength={MAX_CHAT_TEXT_LENGTH}
            placeholder="Напишите сообщение..."
            rows={1}
            className="max-h-40 min-h-11 resize-y py-2.5"
          />
          {text.length > MAX_CHAT_TEXT_LENGTH * 0.8 && (
            <p className="mt-1 text-right text-[11px] text-m3-on-surface-variant">
              {text.length}/{MAX_CHAT_TEXT_LENGTH}
            </p>
          )}
          </div>
          <Button type="submit" size="sm" disabled={sendMutation.isPending || uploading || (!text.trim())}>
            {sendMutation.isPending ? <Icon name="progress_activity" size={16} className="animate-spin" /> : <Icon name="send" size={16} />}
          </Button>
        </form>
      </div>
    </div>
  );
}
