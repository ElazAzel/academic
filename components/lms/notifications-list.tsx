"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Bell,
  MessageCircle,
  Box,
  Layers,
  Info,
  ExternalLink,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  refType: string | null;
  refId: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

function getNotificationIcon(type: string, refType: string | null) {
  if (refType === "popup" || refType === "admin_popup") return Info;
  if (type === "new_message" || refType === "message") return MessageCircle;
  if (type === "block_completed") return Box;
  if (type === "module_completed") return Layers;
  if (type === "question_answered") return MessageCircle;
  if (type === "module_deadline_near") return Clock;
  if (type === "assignment_reviewed") return FileText;
  return Bell;
}

function getNotificationAction(n: NotificationItem): { link: string; label: string } {
  const link = (n.data?.link as string) || "#";

  if (n.refType === "popup" || n.type === "popup") {
    return { link: `/notifications?id=${n.id}`, label: "Посмотреть сообщение" };
  }
  if (n.refType === "message" || n.type === "new_message") {
    return { link: link || "/student/chat", label: "Перейти в чат" };
  }
  if (n.type === "block_completed") {
    return { link: link || "#", label: "Продолжить обучение" };
  }
  if (n.type === "module_completed") {
    return { link: link || "#", label: "Перейти к модулю" };
  }
  if (n.type === "assignment_reviewed") {
    return { link: link || "/student/assignments", label: "Посмотреть оценку" };
  }
  if (n.type === "question_answered") {
    return { link: link || "#", label: "Посмотреть ответ" };
  }
  return { link, label: "Подробнее" };
}

export function NotificationsList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data ?? [];
    },
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markRead", id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleAction = (n: NotificationItem) => {
    const { link } = getNotificationAction(n);
    if (!n.readAt) {
      markRead.mutate(n.id);
    }
    router.push(link);
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} непрочитанных`
              : "Нет непрочитанных"}
          </span>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Прочитать все
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">У вас пока нет уведомлений.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = getNotificationIcon(n.type, n.refType);
            const { label } = getNotificationAction(n);
            return (
              <Card
                key={n.id}
                className={cn(
                  "rounded-2xl cursor-pointer transition-all hover:shadow-sm",
                  !n.readAt && "border-primary/20 bg-primary/[0.02]"
                )}
                onClick={() => handleAction(n)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <span className={cn("mt-1 shrink-0", !n.readAt ? "text-primary" : "text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                      {!n.readAt && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(n);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {label}
                    </button>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ru })}
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
