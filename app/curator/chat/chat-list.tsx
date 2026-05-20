"use client";

import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/lms/chat-panel";
import { BookOpen, CheckCircle2, MessageCircle, Search, ChevronLeft } from "lucide-react";
import type { ConversationInfo } from "@/server/actions/chat";

export function CuratorChatList({
  conversations,
}: {
  conversations: ConversationInfo[];
}) {
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; lessonId?: string; lessonTitle?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () => conversations.filter((c) =>
      c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [conversations, searchQuery]
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations]
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Sidebar — список диалогов (папок) */}
      <div className={`w-80 shrink-0 flex flex-col rounded-2xl border bg-card overflow-hidden ${selectedPartner ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {conversations.length === 0 ? (
                <>
                  <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">Нет диалогов. Когда слушатель напишет, чат появится здесь.</p>
                </>
              ) : (
                <p className="text-xs">Ничего не найдено</p>
              )}
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedPartner?.id === c.partnerId;
              return (
                <button
                  key={c.partnerId}
                  onClick={() => setSelectedPartner({ id: c.partnerId, name: c.partnerName, lessonId: c.lessonId, lessonTitle: c.lessonTitle })}
                  className={`w-full text-left rounded-xl p-3 transition-colors ${
                    isSelected
                      ? "bg-accent ring-1 ring-primary/20"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={c.partnerName} className="h-10 w-10 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{c.partnerName}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(c.lastDate).toLocaleDateString("ru")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                      {c.lessonTitle && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          <BookOpen className="h-3 w-3 shrink-0" />
                          {c.lessonTitle}
                        </span>
                      )}
                    </div>
                    {/* Бейдж непрочитанных */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      {c.unread > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                      <Badge variant={c.responseStatus === "awaiting_reply" ? "destructive" : "secondary"} className="text-[10px] leading-none">
                        {c.responseStatus === "awaiting_reply" ? "Ожидает" : "Отвечено"}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Подвал — сводка по папкам */}
        {conversations.length > 0 && (
          <div className="p-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">{conversations.length} {conversations.length === 1 ? "диалог" : "диалогов"}</span>
              {totalUnread > 0 && (
                <Badge variant="default" className="ml-auto text-[10px]">
                  {totalUnread} {totalUnread === 1 ? "непрочитанное" : "непрочитанных"}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Основная панель — активный диалог */}
      <div className={`flex-1 min-w-0 ${!selectedPartner ? 'hidden lg:flex lg:items-center lg:justify-center' : 'flex'}`}>
        {selectedPartner ? (
          <div className="flex-1 flex flex-col">
            {/* Шапка на мобильных */}
            <div className="flex items-center gap-3 p-3 border-b border-border/60 lg:hidden">
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-1 -ml-1 rounded-lg hover:bg-accent transition-colors"
                aria-label="Назад к списку"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Avatar name={selectedPartner.name} className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedPartner.name}</p>
                {selectedPartner.lessonId && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span className="truncate">{selectedPartner.lessonTitle ?? "Контекст урока"}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1">
              <ChatPanel
                studentId={selectedPartner.id}
                replyLessonId={selectedPartner.lessonId}
                conversationTitle={`Чат: ${selectedPartner.name}`}
                emptyState="Напишите слушателю первое сообщение."
                historyTitle={`Чат со слушателем: ${selectedPartner.name}`}
                otherParticipantName="Слушатель"
                showResponseState
                fullHeight
              />
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center w-full h-full rounded-2xl border border-dashed border-m3-outline-variant bg-m3-surface-container-lowest">
            <div className="text-center px-6">
              <MessageCircle className="mx-auto h-12 w-12 mb-3 opacity-20 text-m3-on-surface-variant" />
              <p className="text-body-md font-body-md text-m3-on-surface-variant">Выберите диалог</p>
              <p className="text-label-sm font-label-sm text-m3-on-surface-variant/60 mt-1">
                {conversations.length > 0
                  ? `${conversations.length} ${conversations.length === 1 ? "диалог" : "диалогов"} · ${totalUnread} ${totalUnread === 1 ? "непрочитанное" : "непрочитанных"}`
                  : "Нет активных диалогов"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
