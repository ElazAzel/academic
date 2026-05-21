"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { getActiveNavHref, type NavItem } from "@/components/layout/navigation";

const BADGE_MAP: Record<string, string> = {
  "notifications": "notifications",
  "chat": "messages",
  "help": "openQuestions",
  "assignment": "pendingReviews",
  "clipboard_check": "pendingReviews",
};

export function NavLinks({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const activeHref = getActiveNavHref(pathname, links);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/unread-counts");
      if (res.ok) {
        const json = await res.json();
        setCounts(json.data ?? {});
      }
    } catch (err) {
      console.error("[NavLinks] Failed to fetch counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstallability = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).standalone === true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasDeferred = !!(window as any).deferredPrompt;
      setIsInstallable(!isStandalone && (hasDeferred || isIOS));
    };

    checkInstallability();

    window.addEventListener("pwa-installable", checkInstallability);
    window.addEventListener("appinstalled", checkInstallability);

    return () => {
      window.removeEventListener("pwa-installable", checkInstallability);
      window.removeEventListener("appinstalled", checkInstallability);
    };
  }, []);

  return (
    <div className="flex flex-col gap-unit">
      {links.map((item) => {
        const isActive = activeHref === item.href;
        const badgeKey = BADGE_MAP[item.icon];
        const badgeCount = badgeKey ? (counts[badgeKey] ?? 0) : 0;
        const showBadge = badgeCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "group flex items-center gap-md rounded-lg px-md py-sm text-label-lg font-label-lg transition-all duration-200 ease-in-out",
              isActive
                ? "border-l-4 border-m3-secondary-container bg-m3-secondary-fixed/10 font-bold text-m3-primary"
                : "border-l-4 border-transparent text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
            )}
          >
            <Icon
              name={item.icon}
              size={20}
              className={cn(
                "shrink-0 transition-colors",
                isActive
                  ? "text-m3-primary"
                  : "text-m3-on-surface-variant group-hover:text-m3-on-surface"
              )}
            />
            <span className="flex-1">{item.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-m3-error px-1.5 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}

      {isInstallable && (
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("pwa-trigger-install"));
          }}
          className={cn(
            "group flex items-center gap-md rounded-lg px-md py-sm text-label-lg font-label-lg transition-all duration-200 ease-in-out text-left mt-2",
            "border-l-4 border-transparent text-m3-primary bg-m3-primary-container/10 hover:bg-m3-primary-container/20"
          )}
        >
          <Icon
            name="download"
            size={20}
            className="shrink-0 text-m3-primary group-hover:scale-110 transition-transform"
          />
          <span className="flex-1 font-semibold">Установить приложение</span>
        </button>
      )}
    </div>
  );
}
