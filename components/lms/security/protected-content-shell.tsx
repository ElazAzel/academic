"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DynamicWatermark } from "./dynamic-watermark";

type ProtectionLevel = "none" | "standard" | "strict";

interface ContentProtectionSettings {
  signedUrlTtlSeconds: number;
  watermarkEnabled: boolean;
  contextMenuDisabled: boolean;
  visibilityLogging: boolean;
  aggressiveAudit: boolean;
}

const PROTECTION_SETTINGS: Record<ProtectionLevel, ContentProtectionSettings> = {
  none: {
    signedUrlTtlSeconds: 0,
    watermarkEnabled: false,
    contextMenuDisabled: false,
    visibilityLogging: false,
    aggressiveAudit: false,
  },
  standard: {
    signedUrlTtlSeconds: 900,
    watermarkEnabled: true,
    contextMenuDisabled: true,
    visibilityLogging: false,
    aggressiveAudit: false,
  },
  strict: {
    signedUrlTtlSeconds: 180,
    watermarkEnabled: true,
    contextMenuDisabled: true,
    visibilityLogging: true,
    aggressiveAudit: true,
  },
};

function getContentProtectionSettings(level: ProtectionLevel): ContentProtectionSettings {
  return PROTECTION_SETTINGS[level];
}

interface ProtectedContentShellProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
  courseId: string;
  lessonId: string;
  protectionLevel?: ProtectionLevel;
  children: React.ReactNode;
}

export function ProtectedContentShell({
  user,
  courseId,
  lessonId,
  protectionLevel = "standard",
  children,
}: ProtectedContentShellProps) {
  const [showWarning, setShowWarning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const settings = getContentProtectionSettings(protectionLevel);

  useEffect(() => {
    if (!settings.watermarkEnabled) return;

    const stored = sessionStorage.getItem(`content-warning-shown-${lessonId}`);
    if (!stored) {
      setShowWarning(true);
    }
  }, [lessonId, settings.watermarkEnabled]);

  const handleDismissWarning = useCallback(() => {
    setShowWarning(false);
    sessionStorage.setItem(`content-warning-shown-${lessonId}`, "1");
  }, [lessonId]);

  useEffect(() => {
    if (!settings.contextMenuDisabled || !contentRef.current) return;

    const el = contentRef.current;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      if (
        e.target instanceof HTMLImageElement ||
        e.target instanceof HTMLVideoElement ||
        e.target instanceof HTMLAudioElement
      ) {
        e.preventDefault();
      }
    };

    el.addEventListener("contextmenu", handleContextMenu);
    el.addEventListener("dragstart", handleDragStart);

    return () => {
      el.removeEventListener("contextmenu", handleContextMenu);
      el.removeEventListener("dragstart", handleDragStart);
    };
  }, [settings.contextMenuDisabled]);

  useEffect(() => {
    if (!settings.visibilityLogging) return;

    const handleVisibilityChange = async () => {
      const state = document.visibilityState === "hidden" ? "hidden" : "visible";
      try {
        await fetch("/api/v1/lessons/log-visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, state }),
        });
      } catch {
        // Silently fail — logging should not break UX
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lessonId, settings.visibilityLogging]);

  return (
    <div ref={contentRef} className="relative">
      {showWarning && settings.watermarkEnabled && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Материалы курса защищены персональным водяным знаком. Запись, копирование и распространение материалов без разрешения запрещены.
              </p>
              {protectionLevel === "strict" && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Контент защищён персональным водяным знаком. Распространение материалов запрещено.
                </p>
              )}
            </div>
            <button
              onClick={handleDismissWarning}
              className="shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200"
              aria-label="Закрыть"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {children}

        {settings.watermarkEnabled && (
          <DynamicWatermark
            userName={user.name}
            userId={user.id}
            courseId={courseId}
            lessonId={lessonId}
          />
        )}
      </div>
    </div>
  );
}
