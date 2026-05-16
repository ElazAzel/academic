"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BMrE5tJvN0Rg-8WJX3qFgKfLqZkHpOQiVmDdYp0AzRvP1cSxUwYn2aLb4Eo7Gt8IjKmNoQrStUvWxYz3C6F9H=";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr;
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return;
    }

    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array(key.buffer, key.byteOffset, key.byteLength) as unknown as BufferSource,
    });

    // Send subscription to server
    await fetch("/api/v1/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    // Push subscription failed — not critical (user may have denied permission)
  }
}

/**
 * Registers the service worker and handles the PWA install prompt.
 * Also listens for build update messages from the SW and subscribes to push.
 */
export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Subscribe to push notifications after registration
        subscribeToPush(registration);

        // Listen for updates from service worker
        if (registration.active) {
          registration.active.postMessage({ type: "CHECK_VERSION" });
        }

        // Re-subscribe on controller change (new SW activated)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                subscribeToPush(registration);
              }
            });
          }
        });
      })
      .catch(() => {
        // SW registration failed — non-critical
      });

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
