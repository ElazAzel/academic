"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the service worker and handles the PWA install prompt.
 * Also listens for build update messages from the SW.
 */
export function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Listen for updates from service worker
          if (registration.active) {
            registration.active.postMessage({ type: "CHECK_VERSION" });
          }
        })
        .catch(() => {
          // Service worker registration failed — non-critical
        });
    }

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "BUILD_UPDATED") {
        toast.success("Платформа обновлена!", {
          description: "Версия сборки обновлена. Перезагрузите страницу для применения изменений.",
          duration: 10000,
          action: {
            label: "Обновить",
            onClick: () => window.location.reload(),
          },
        });
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Handle successful install
    const handleAppInstalled = () => {
      toast.success("Приложение установлено!", {
        description: "AI Strategic Academy теперь доступна с рабочего стола.",
        duration: 5000,
      });
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
