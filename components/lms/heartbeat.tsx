"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 минут

/**
 * Фоновый heartbeat — обновляет lastLoginAt пользователя каждые 5 минут.
 * Встраивается в корневой layout, чтобы отслеживать активность.
 */
export function Heartbeat() {
  useEffect(() => {
    const send = () => {
      fetch("/api/v1/heartbeat", { method: "POST" }).catch(() => {
        // Ignore network errors
      });
    };

    // Send immediately on mount
    send();

    const interval = setInterval(send, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}
