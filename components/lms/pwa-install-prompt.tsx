"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Download, Share2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "android" | "ios" | "other";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any;

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosNav = navigator as IOSNavigator;
  return window.matchMedia("(display-mode: standalone)").matches ||
    iosNav.standalone === true;
}

/**
 * Баннер установки PWA.
 * Показывает кнопку "Установить" на Android (через beforeinstallprompt)
 * и инструкцию на iOS Safari.
 * Автоматически скрывается, если приложение уже установлено.
 */
export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shouldReduce = useReducedMotion();
  const platform = detectPlatform();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!mounted) return null;
  if (isStandalone()) return null;

  // На iOS всегда предлагаем инструкцию (beforeinstallprompt не работает)
  const showBanner = !dismissed && (
    (platform === "android" && installEvent) ||
    platform === "ios"
  );

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowIOSInstructions(true);
      return;
    }
    if (!installEvent) return;
    const e = installEvent as BeforeInstallPromptEvent;
    e.prompt();
    const result = await e.userChoice;
    if (result.outcome === "accepted") {
      setInstallEvent(null);
    }
    setDismissed(true);
  };

  if (!showBanner && !showIOSInstructions) return null;

  return (
    <AnimatePresence>
      {showBanner && !showIOSInstructions && (
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 80 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="rounded-2xl border bg-card p-4 shadow-panel backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Установите приложение</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Быстрый доступ к платформе с рабочего стола
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                {platform === "ios" ? "Как установить" : "Установить"}
              </Button>
              <Button size="sm" variant="ghost" className="flex-none" onClick={() => setDismissed(true)}>
                Не сейчас
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS инструкция */}
      {showIOSInstructions && (
        <motion.div
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduce ? { opacity: 1 } : { opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <motion.div
            initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 40 }}
            transition={shouldReduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Установка на iPhone/iPad</h3>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Step number={1} icon={<Monitor className="h-5 w-5" />}>
                Откройте сайт в браузере <strong>Safari</strong>
              </Step>
              <Step number={2} icon={<Share2 className="h-5 w-5" />}>
                Нажмите на иконку <strong>«Поделиться»</strong> в нижней панели
              </Step>
              <Step number={3} icon={<Download className="h-5 w-5" />}>
                Пролистайте вниз и выберите <strong>«На экран «Домой»</strong>
              </Step>
              <Step number={4}>
                Нажмите <strong>«Добавить»</strong> в правом верхнем углу
              </Step>
            </div>

            <div className="mt-6 rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                После установки приложение появится на рабочем столе как отдельная иконка.
                Уведомления будут приходить даже при закрытом браузере.
              </p>
            </div>

            <Button
              className="mt-4 w-full"
              size="sm"
              onClick={() => setShowIOSInstructions(false)}
            >
              Понятно
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ number, icon, children }: { number: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {number}
      </span>
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}
