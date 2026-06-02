"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 минут

/**
 * Фоновый heartbeat — обновляет lastLoginAt пользователя каждые 5 минут.
 * Встраивается в корневой layout, чтобы отслеживать активность.
 */
export function Heartbeat() {
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";

  useEffect(() => {
    if (status === "loading" || !session?.user?.id) return;

    const send = async () => {
      try {
        const response = await fetch("/api/v1/heartbeat", { method: "POST" });
        if (response.status === 401 || response.status === 403) {
          await signOut({ callbackUrl: "/login?reason=device-limit", redirect: true });
        }
      } catch {
        // Ignore network errors
      }
    };

    // Send immediately on mount
    send();

    const interval = setInterval(send, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [session?.user?.id, status]);

  return null;
}
