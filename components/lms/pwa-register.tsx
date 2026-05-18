"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Read the VAPID public key from the environment.
 * The key must be set as NEXT_PUBLIC_VAPID_PUBLIC_KEY in env vars.
 */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function bufferSourceToUint8Array(source: BufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn("[PWA] VAPID_PUBLIC_KEY not configured — push notifications disabled");
    return;
  }

  try {
    // Check notification permission
    if (Notification.permission === "denied") {
      console.log("[PWA] Notification permission denied by user");
      return;
    }

    // Request permission if not yet granted
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        console.log("[PWA] Notification permission not granted:", result);
        return;
      }
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If existing subscription uses a different key, unsubscribe first
    if (subscription) {
      try {
        const existingKey = subscription.options?.applicationServerKey;
        const newKey = new Uint8Array(urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY));
        if (existingKey) {
          const existingKeyArray = bufferSourceToUint8Array(existingKey);
          const keysMatch = existingKeyArray.length === newKey.length &&
            existingKeyArray.every((val, i) => val === newKey[i]);
          if (!keysMatch) {
            console.log("[PWA] VAPID key changed, re-subscribing...");
            // Notify server about unsubscribe
            await fetch("/api/v1/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            }).catch(() => {});
            await subscription.unsubscribe();
            subscription = null;
          }
        }
      } catch {
        // If key comparison fails, keep existing subscription
      }
    }

    // Already subscribed with correct key
    if (subscription) {
      // Re-send subscription to server in case it was lost
      await fetch("/api/v1/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {});
      return;
    }

    // Create new subscription
    const applicationServerKey = urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Send subscription to server
    const response = await fetch("/api/v1/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (response.ok) {
      console.log("[PWA] Push subscription registered successfully");
    } else {
      console.error("[PWA] Failed to register push subscription:", response.status);
    }
  } catch (error) {
    console.error("[PWA] Push subscription failed:", error);
    // Push subscription failed — not critical (user may have denied permission)
  }
}

/**
 * Registers the service worker and handles the PWA install prompt.
 * Also listens for build update messages from the SW and subscribes to push.
 */
export function PWARegister() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

        // Subscribe to push notifications (only once per session)
        if (!subscribed.current) {
          subscribed.current = true;
          subscribeToPush(registration);
        }

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
      .catch((error) => {
        console.error("[PWA] Service worker registration failed:", error);
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

      // Navigate to target URL when push notification is clicked
      if (event.data?.type === "NAVIGATE" && event.data?.url) {
        const targetUrl = new URL(event.data.url, window.location.origin).href;
        const currentUrl = window.location.href;
        if (targetUrl !== currentUrl) {
          window.location.href = targetUrl;
        }
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
