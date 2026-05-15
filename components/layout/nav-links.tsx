"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ICON_MAP } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/navigation";

const BADGE_MAP: Record<string, string> = {
  "Уведомления": "notifications",
  "Чат": "messages",
  "Вопросы": "openQuestions",
  "Проверка": "pendingReviews",
};

export function NavLinks({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsLoaded, setCountsLoaded] = useState(false);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/unread-counts");
      if (res.ok) {
        const json = await res.json();
        setCounts(json.data ?? {});
        setCountsLoaded(true);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return (
    <>
      {links.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const badgeKey = BADGE_MAP[item.label];
        const badgeCount = badgeKey ? (counts[badgeKey] ?? 0) : 0;
        const showBadge = badgeCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{item.label}</span>
            {showBadge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
