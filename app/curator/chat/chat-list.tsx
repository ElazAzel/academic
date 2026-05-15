"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatPanel } from "@/components/lms/chat-panel";
import { BookOpen, MessageCircle, Search } from "lucide-react";
import type { ConversationInfo } from "@/server/actions/chat";

export function CuratorChatList({
  conversations,
}: {
  conversations: ConversationInfo[];
}) {
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; lessonId?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = conversations.filter((c) =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {conversations.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Нет диалогов. Когда слушатель напишет, чат появится здесь.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-xl border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>
          ) : (
              filtered.map((c) => (
              <Card
                key={c.partnerId}
                className="rounded-2xl cursor-pointer transition-all hover:shadow-md"
                onClick={() => setSelectedPartner({ id: c.partnerId, name: c.partnerName, lessonId: c.lessonId })}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar name={c.partnerName} className="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.partnerName}</p>
                      {c.unread > 0 && <Badge className="bg-primary text-primary-foreground">{c.unread}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(c.lastDate).toLocaleDateString("ru")}
                      </p>
                      {c.lessonTitle && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 truncate">
                          <BookOpen className="h-3 w-3 shrink-0" />
                          {c.lessonTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </>
      )}

      {selectedPartner && (
        <Dialog open={true} onOpenChange={() => setSelectedPartner(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Чат: {selectedPartner.name}</DialogTitle>
              {selectedPartner.lessonId && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Контекст: {selectedPartner.lessonId}
                </p>
              )}
            </DialogHeader>
            {/* Показываем ВСЮ историю переписки (без lessonId), контекст урока — только для справки */}
            <ChatPanel studentId={selectedPartner.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
