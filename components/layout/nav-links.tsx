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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
         
        (navigator as any).standalone === true;
       
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
              "group relative flex items-center gap-sm rounded-lg border px-sm py-sm text-label-lg font-label-lg",
              "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
              isActive
                ? "border-m3-primary/20 bg-m3-primary-fixed/45 font-bold text-m3-primary shadow-[inset_3px_0_0_var(--m3-primary),0_8px_18px_rgba(22,63,130,0.08)]"
                : "border-transparent text-m3-on-surface-variant hover:border-m3-outline-variant/70 hover:bg-m3-surface-container-high/80 hover:text-m3-on-surface"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200",
                isActive
                  ? "bg-m3-surface-container-lowest text-m3-primary"
                  : "bg-transparent text-m3-on-surface-variant group-hover:bg-m3-surface-container-lowest group-hover:text-m3-primary"
              )}
              aria-hidden="true"
            >
              <Icon name={item.icon} size={20} />
            </span>
            <span className="flex-1">{item.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-m3-error px-1.5 text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(186,26,26,0.2)]">
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
            "group mt-2 flex items-center gap-sm rounded-lg border px-sm py-sm text-left text-label-lg font-label-lg transition-all duration-200 ease-out",
            "border-m3-primary/15 bg-m3-primary-fixed/35 text-m3-primary hover:border-m3-primary/30 hover:bg-m3-primary-fixed/55"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-surface-container-lowest text-m3-primary">
            <Icon name="download" size={20} className="transition-transform group-hover:scale-110" />
          </span>
          <span className="flex-1 font-semibold">Установить приложение</span>
        </button>
      )}
    </div>
  );
}
