"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 минуты

/**
 * Фоновый трекер сессий посещений.
 * - На монтировании создаёт сессию (POST /api/v1/sessions/start)
 * - Каждые 2 мин обновляет (POST /api/v1/sessions/heartbeat)
 * - На размонтировании / beforeunload завершает сессию (POST /api/v1/sessions/end)
 *
 * Использует sessionId из next-auth — если пользователь не авторизован, ничего не делает.
 */
export function VisitTracker() {
  const { data: session } = useSession();
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    endedRef.current = false;

    // 1. Начать сессию
    const startSession = async () => {
      try {
        const res = await fetch("/api/v1/sessions/start", { method: "POST" });
        if (!res.ok) return;
        const body = (await res.json()) as { data?: { sessionId: string } };
        if (body.data?.sessionId) {
          sessionIdRef.current = body.data.sessionId;
        }
      } catch {
        // Игнорируем ошибки сети
      }
    };

    startSession();

    // 2. Периодический heartbeat
    const interval = setInterval(async () => {
      if (!sessionIdRef.current) return;
      try {
        const res = await fetch("/api/v1/sessions/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
        if (res.status === 401 || res.status === 403) {
          await signOut({ callbackUrl: "/login?reason=device-limit", redirect: true });
        }
      } catch {
        // Игнорируем
      }
    }, HEARTBEAT_INTERVAL);

    // 3. Завершить сессию при уходе
    const endSession = () => {
      if (!sessionIdRef.current || endedRef.current) return;
      endedRef.current = true;
      // Используем sendBeacon с правильным Content-Type для JSON
      const payload = JSON.stringify({ sessionId: sessionIdRef.current });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/v1/sessions/end", blob);
    };

    window.addEventListener("beforeunload", endSession);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", endSession);
      endSession();
    };
  }, [session?.user?.id]);

  return null;
}
