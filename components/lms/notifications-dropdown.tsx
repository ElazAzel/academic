"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, ChevronRight, ExternalLink, MessageCircle, Box, Layers, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  if (refType === "popup") return Info;
  if (type === "new_message" || refType === "message") return MessageCircle;
  if (type === "block_completed") return Box;
  if (type === "module_completed") return Layers;
  return Bell;
}

function getNotificationAction(n: NotificationItem): { link: string; label: string } {
  const link = n.data?.link as string;

  if (n.refType === "popup") {
    return { link: "/notifications", label: "Посмотреть" };
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
  return { link: link || "/notifications", label: "Подробнее" };
}

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAllRead() {
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch {
      // silent
    }
  }

  function handleClick(n: NotificationItem) {
    const { link } = getNotificationAction(n);
    router.push(link);
  }

  function handleMore(e: React.MouseEvent, n: NotificationItem) {
    e.stopPropagation();
    const { link } = getNotificationAction(n);
    router.push(link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Уведомления"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Уведомления</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Прочитать все
              </button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
              Нет уведомлений
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => {
              const Icon = getNotificationIcon(n.type, n.refType);
              const { label } = getNotificationAction(n);
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn("flex-col items-start gap-1 py-3", !n.readAt && "bg-primary/[0.03]")}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex w-full items-center gap-2">
                    <Icon className={cn("h-4 w-4 shrink-0", !n.readAt ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("flex-1 text-sm", !n.readAt && "font-semibold")}>{n.title}</span>
                  </div>
                  <span className="line-clamp-2 pl-6 text-xs text-muted-foreground">{n.body}</span>
                  <button
                    onClick={(e) => handleMore(e, n)}
                    className="ml-6 mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {label}
                  </button>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
