"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface NotificationItem {
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

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const lastEventId = useRef<string>(new Date(0).toISOString());

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const json = await res.json();
        const items: NotificationItem[] = json.data ?? [];
        setNotifications(items);
        if (items.length > 0) {
          lastEventId.current = items[0].createdAt;
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitial();

    const connect = () => {
      const es = new EventSource(`/api/v1/notifications/stream?since=${encodeURIComponent(lastEventId.current)}`);
      esRef.current = es;

      es.addEventListener("connected", () => {
        setConnected(true);
      });

      es.addEventListener("notification", (e) => {
        try {
          const items: NotificationItem[] = JSON.parse(e.data);
          if (items.length > 0) {
            lastEventId.current = items[0].createdAt;
            setNotifications((prev) => {
              const existing = new Set(prev.map((n) => n.id));
              const newItems = items.filter((n) => !existing.has(n.id));
              return [...newItems, ...prev].slice(0, 100);
            });
          }
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("error", () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      });
    };

    connect();

    return () => {
      esRef.current?.close();
    };
  }, [fetchInitial]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return { notifications, unreadCount, loading, connected, setNotifications };
}
