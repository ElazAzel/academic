"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { sendMessageAction, getConversation, markAsRead, getUploadUrl } from "@/server/actions/chat";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  senderId: string;
  senderName: string;
  createdAt: string;
  isMine: boolean;
}

export function ChatPanel({
  lessonId,
  curatorId,
  studentId,
}: {
  lessonId?: string;
  curatorId?: string;
  studentId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getConversation(studentId, lessonId).then(setMessages);
  }, [studentId, lessonId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unreadIds = messages.filter((m) => !m.isMine).map((m) => m.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  }, [messages]);

  async function handleSend(formData: FormData) {
    if (!text.trim()) return;
    formData.set("text", text);
    if (lessonId) formData.set("lessonId", lessonId);
    if (curatorId) formData.set("receiverId", curatorId);
    setSending(true);
    try {
      const result = await sendMessageAction(formData);
      if (result.success) {
        setText("");
        const updated = await getConversation(studentId, lessonId);
        setMessages(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Файл слишком большой. Максимум 15MB");
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Только PNG и JPEG");
      return;
    }
    setUploading(true);
    try {
      const { url, publicUrl } = await getUploadUrl();
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const formData = new FormData();
      formData.set("attachmentUrl", publicUrl);
      formData.set("attachmentType", file.type);
      if (lessonId) formData.set("lessonId", lessonId);
      if (curatorId) formData.set("receiverId", curatorId);
      await sendMessageAction(formData);
      const updated = await getConversation(studentId, lessonId);
      setMessages(updated);
    } catch {
      toast.error("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-card">
      <div className="flex-1 space-y-3 overflow-auto p-4 max-h-[400px] min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Начните диалог с куратором</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.text && <p className="text-sm">{m.text}</p>}
              {m.attachmentUrl && (
                <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`block mt-1 text-xs underline ${m.isMine ? "text-primary-foreground/80" : "text-primary"}`}>
                  📎 {m.attachmentType?.includes("image") ? "Изображение" : "Файл"}
                </a>
              )}
              <p className={`text-[10px] mt-1 ${m.isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(m.createdAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3">
        <form action={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Input
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={sending || (!text.trim())}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
