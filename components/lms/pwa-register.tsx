"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the service worker and handles the PWA install prompt.
 */
export function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Service worker registration failed — non-critical
        });
    }

    // Handle successful install
    const handleAppInstalled = () => {
      toast.success("Приложение установлено!", {
        description: "AI Strategic Academy теперь доступна с рабочего стола.",
        duration: 5000,
      });
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => window.removeEventListener("appinstalled", handleAppInstalled);
  }, []);

  return null;
}
