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
import { PopupNotificationViewer } from "@/components/lms/popup-notification-viewer";

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
  // Для popup: используем data.linkUrl (внешняя ссылка) или data.link (страница)
  if (n.refType === "popup" || n.type === "popup") {
    const linkUrl = (n.data?.linkUrl as string) || (n.data?.link as string) || `/notifications?id=${n.id}`;
    return { link: linkUrl, label: "Посмотреть сообщение" };
  }
  // Для сообщений: используем data.link (урок чата) или общий чат
  if (n.refType === "message" || n.type === "new_message") {
    const msgLink = (n.data?.link as string) || (n.refId && n.refId !== "general" ? `/student/lessons/${n.refId}` : "/student/chat");
    return { link: msgLink, label: "Перейти в чат" };
  }
  // Для блока/модуля: используем data.link из progress/service.ts
  if (n.type === "block_completed") {
    const blkLink = (n.data?.link as string) || "#";
    return { link: blkLink, label: "Продолжить обучение" };
  }
  if (n.type === "module_completed") {
    const modLink = (n.data?.link as string) || "#";
    return { link: modLink, label: "Перейти к модулю" };
  }
  if (n.type === "assignment_reviewed") {
    return { link: (n.data?.link as string) || "/student/assignments", label: "Посмотреть оценку" };
  }
  if (n.type === "question_answered") {
    return { link: (n.data?.link as string) || "#", label: "Посмотреть ответ" };
  }
  const defaultLink = (n.data?.link as string) || "#";
  return { link: defaultLink, label: "Подробнее" };
}

export function NotificationsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [popupView, setPopupView] = useState<{ n: NotificationItem } | null>(null);

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
    // Popup без внешней ссылки — показываем в диалоге
    const isPopup = n.refType === "popup" || n.type === "popup";
    const hasLinkUrl = n.data?.linkUrl;
    if (isPopup && !hasLinkUrl) {
      if (!n.readAt) markRead.mutate(n.id);
      setPopupView({ n });
      return;
    }
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
      <PopupNotificationViewer
        popup={popupView ? {
          id: popupView.n.refId ?? popupView.n.id,
          title: popupView.n.title ?? "Сообщение",
          body: popupView.n.body ?? "",
          imageUrl: popupView.n.data?.imageUrl as string | undefined | null,
          linkUrl: popupView.n.data?.linkUrl as string | undefined | null,
          linkText: popupView.n.data?.linkText as string | undefined | null,
          notificationTitle: popupView.n.title,
        } : null}
        open={popupView !== null}
        onClose={() => setPopupView(null)}
      />
    </div>
  );
}
