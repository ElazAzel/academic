"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { Icon } from "@/components/ui/icon";
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

function getNotificationIcon(type: string, refType: string | null): string {
  if (refType === "popup" || refType === "admin_popup") return "info";
  if (type === "new_message" || refType === "message") return "chat";
  if (type === "block_completed") return "inventory_2";
  if (type === "module_completed") return "layers";
  if (type === "question_answered") return "chat";
  if (type === "module_deadline_near") return "schedule";
  if (type === "assignment_reviewed") return "description";
  return "notifications";
}

function getNotificationAction(n: NotificationItem): { link: string; label: string } {
  if (n.refType === "popup" || n.type === "popup") {
    const linkUrl = (n.data?.linkUrl as string) || (n.data?.link as string) || `/notifications?id=${n.id}`;
    return { link: linkUrl, label: "Посмотреть сообщение" };
  }
  if (n.refType === "message" || n.type === "new_message") {
    const msgLink = (n.data?.link as string) || (n.refId && n.refId !== "general" ? `/student/lessons/${n.refId}` : "/student");
    return { link: msgLink, label: "Перейти в чат" };
  }
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

function formatGroupLabel(key: string): string {
  switch (key) {
    case "today": return "Сегодня";
    case "yesterday": return "Вчера";
    case "week": return "На этой неделе";
    case "earlier": return "Ранее";
    default: return key;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) {
    return formatDistanceToNow(d, { addSuffix: true, locale: ru });
  }
  if (isYesterday(d)) {
    return "Вчера";
  }
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
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

  // Группировка по дате: сегодня, вчера, на этой неделе, ранее
  const grouped = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {
      today: [],
      yesterday: [],
      week: [],
      earlier: [],
    };
    for (const n of notifications) {
      const d = new Date(n.createdAt);
      if (isToday(d)) groups.today.push(n);
      else if (isYesterday(d)) groups.yesterday.push(n);
      else if (isThisWeek(d)) groups.week.push(n);
      else groups.earlier.push(n);
    }
    // Удаляем пустые группы
    const result: Record<string, NotificationItem[]> = {};
    for (const [key, items] of Object.entries(groups)) {
      if (items.length > 0) result[key] = items;
    }
    return result;
  }, [notifications]);

  const groupKeys = ["today", "yesterday", "week", "earlier"].filter((k) => grouped[k]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="notifications" size={20} className="text-m3-primary" />
          <span className="text-body-md font-body-md text-m3-on-surface-variant">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "непрочитанное" : "непрочитанных"}`
              : "Нет непрочитанных"}
          </span>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-label-md font-label-md"
          >
            <Icon name="done_all" size={14} className="mr-1.5" />
            Прочитать все
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div role="status" aria-live="polite" className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-m3-primary border-t-transparent" />
          <span className="sr-only">Загрузка уведомлений...</span>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="py-16 text-center">
            <Icon name="notifications" size={40} className="mx-auto mb-3 text-m3-on-surface-variant/40" />
            <p className="text-body-md font-body-md text-m3-on-surface-variant">У вас пока нет уведомлений.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupKey) => {
            const items = grouped[groupKey];
            const hasUnread = items.some((n) => !n.readAt);
            return (
              <section key={groupKey}>
                {/* Заголовок группы — блок даты */}
                <div className="flex items-center gap-3 mb-3">
                  {hasUnread && <span className="h-2 w-2 rounded-full bg-m3-primary shrink-0" />}
                  <h3 className={cn(
                    "text-label-lg font-label-lg",
                    hasUnread ? "text-m3-on-surface" : "text-m3-on-surface-variant"
                  )}>
                    {formatGroupLabel(groupKey)}
                  </h3>
                  <div className="flex-1 h-px bg-m3-outline-variant/50" />
                  <span className="text-label-sm font-label-sm text-m3-on-surface-variant/60">
                    {items.length} {items.length === 1 ? "уведомление" : "уведомлений"}
                  </span>
                </div>

                {/* Карточки группы */}
                <div className="space-y-2">
                  {items.map((n) => {
                    const iconName = getNotificationIcon(n.type, n.refType);
                    const { label } = getNotificationAction(n);
                    const isUnread = !n.readAt;
                    return (
                      <Card
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "rounded-lg border shadow-m3-soft cursor-pointer transition-all hover:shadow-m3-soft-hover overflow-hidden",
                          isUnread
                            ? "border-m3-primary-fixed-dim bg-m3-primary-fixed/10"
                            : "border-m3-outline-variant bg-m3-surface-container-lowest"
                        )}
                        onClick={() => handleAction(n)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleAction(n); } }}
                      >
                        <CardContent className="flex items-start gap-4 p-4">
                          {/* Unread indicator line + icon */}
                          <div className="relative shrink-0 mt-1">
                            {isUnread && (
                              <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-m3-primary" />
                            )}
                            <Icon
                              name={iconName}
                              size={20}
                              className={isUnread ? "text-m3-primary" : "text-m3-on-surface-variant"}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-body-md font-body-md line-clamp-1",
                                isUnread && "font-semibold text-m3-on-surface"
                              )}>
                                {n.title}
                              </p>
                              <span className="shrink-0 text-label-sm font-label-sm text-m3-on-surface-variant/70 whitespace-nowrap">
                                {formatTime(n.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-label-sm font-label-sm text-m3-on-surface-variant line-clamp-2">
                              {n.body}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(n);
                              }}
                              className="mt-2 inline-flex items-center gap-1 text-label-sm font-label-sm text-m3-primary hover:underline"
                            >
                              <Icon name="open_in_new" size={12} />
                              {label}
                            </button>
                          </div>

                          <Icon name="chevron_right" size={16} className="mt-1 shrink-0 text-m3-on-surface-variant/40" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
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
