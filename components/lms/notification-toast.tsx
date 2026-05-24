"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { MessageCircle, Box, Layers, Bell, Info, FileText, Clock, CheckCircle, ExternalLink, UserPlus, Award, AlertTriangle } from "lucide-react";
import Link from "next/link";

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

type ToastCategory = "message" | "progress" | "system" | "default";

function getCategory(type: string, refType: string | null): ToastCategory {
  if (refType === "popup" || type === "popup" || type === "access_granted" || type === "certificate_available" || type === "certificate_revoked" || type === "curator_assigned" || type === "student_assigned" || type === "password_changed" || type === "profile_updated" || type === "curator_response_reminder" || type === "user_inactive") return "system";
  if (type === "new_message" || refType === "message" || type === "question_answered" || type === "question_received" || type === "question_forwarded") return "message";
  if (type === "block_completed" || type === "module_completed" || type === "course_opened" || type === "new_lesson_available") return "progress";
  return "default";
}

const categoryConfig: Record<ToastCategory, { surface: string; border: string; icon: React.ElementType }> = {
  message: {
    surface: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200/50 dark:border-blue-800/30",
    icon: MessageCircle,
  },
  progress: {
    surface: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
    icon: Box,
  },
  system: {
    surface: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200/50 dark:border-amber-800/30",
    icon: Bell,
  },
  default: {
    surface: "bg-card",
    border: "border-primary/20 dark:border-primary/10",
    icon: Info,
  },
};

function getTypeIcon(type: string, refType: string | null) {
  if (refType === "popup" || type === "popup") return Info;
  if (type === "new_message" || refType === "message") return MessageCircle;
  if (type === "block_completed") return Box;
  if (type === "module_completed") return Layers;
  if (type === "module_deadline_near") return Clock;
  if (type === "assignment_reviewed") return FileText;
  if (type === "certificate_available" || type === "certificate_revoked") return Award;
  if (type === "access_granted" || type === "curator_assigned" || type === "student_assigned") return UserPlus;
  if (type === "user_inactive" || type === "curator_response_reminder") return AlertTriangle;
  if (type === "course_opened" || type === "new_lesson_available") return CheckCircle;
  return Bell;
}

function getNotificationLink(n: NotificationItem): string {
  if (n.refType === "popup" || n.type === "popup") {
    return (n.data?.linkUrl as string) || (n.data?.link as string) || "/notifications";
  }
  if (n.refType === "message" || n.type === "new_message") {
    return (n.data?.link as string) || "/notifications";
  }
  if (n.type === "block_completed" || n.type === "module_completed") {
    return (n.data?.link as string) || "/student";
  }
  return (n.data?.link as string) || "/notifications";
}

function showNotificationToast(n: NotificationItem) {
  const category = getCategory(n.type, n.refType);
  const config = categoryConfig[category];
  const Icon = getTypeIcon(n.type, n.refType);
  const link = getNotificationLink(n);

  toast.custom(
    (t) => (
      <Link
        href={link}
        onClick={() => { toast.dismiss(t); }}
        className={[
          "relative flex w-[360px] max-w-[90vw] items-start gap-3 rounded-lg border p-4 shadow-m3-modal",
          config.surface,
          config.border,
        ].join(" ")}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{n.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Подробнее
          </span>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.dismiss(t); }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          aria-label="Закрыть"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1L9 9M9 1L1 9" />
          </svg>
        </button>
        <div
          className={[
            "absolute bottom-0 left-0 h-[3px] rounded-full animate-notification-progress",
            category === "message" ? "bg-blue-500/40" : "",
            category === "progress" ? "bg-emerald-500/40" : "",
            category === "system" ? "bg-amber-500/40" : "",
            category === "default" ? "bg-primary/40" : "",
          ].join(" ")}
          style={{ animation: "notification-progress 5s linear forwards" }}
        />
      </Link>
    ),
    {
      duration: 5000,
      position: "bottom-right",
      style: { padding: 0, background: "transparent", boxShadow: "none", border: "none" },
    }
  );
}

export function NotificationToast() {
  const { data: session, status: sessionStatus } = useSession();
  const shownIdsRef = useRef(new Set<string>());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return;

    let mounted = true;

    async function checkNotifications() {
      try {
        const res = await fetch("/api/v1/notifications");
        if (!res.ok) return;
        const json = await res.json();
        const notifications: NotificationItem[] = json.data ?? [];

        for (const n of notifications) {
          if (n.readAt) continue;
          if (shownIdsRef.current.has(n.id)) continue;
          shownIdsRef.current.add(n.id);
          if (mounted) showNotificationToast(n);
        }
      } catch {
        // Silently ignore
      }
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      checkNotifications();
    }

    const interval = setInterval(checkNotifications, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, [sessionStatus, session?.user]);

  return null;
}
