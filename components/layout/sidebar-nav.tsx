"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  getActiveNavHref,
  NAV_GROUPS_BY_ROLE,
  type NavGroup,
  type NavItem,
} from "@/components/layout/navigation";
import type { RoleKey } from "@/types/domain";

const BADGE_MAP: Record<string, string> = {
  "notifications": "notifications",
  "chat": "messages",
  "help": "openQuestions",
  "assignment": "pendingReviews",
  "clipboard_check": "pendingReviews",
};

const COLLAPSE_KEY = "academy.sidebar.collapsed";

function useUnreadCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/unread-counts");
      if (res.ok) {
        const json = await res.json();
        setCounts(json.data ?? {});
      }
    } catch {
      /* счётчики некритичны — молча пропускаем сбой сети */
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(fetchCounts, 0);
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fetchCounts]);

  return counts;
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_KEY) === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(stored);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--shell-sidebar-width", collapsed ? "76px" : "264px");
    return () => {
      document.documentElement.style.removeProperty("--shell-sidebar-width");
    };
  }, [collapsed]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* приватный режим — состояние не сохраняем */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

function SidebarLink({
  item,
  active,
  badgeCount,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  badgeCount: number;
  collapsed: boolean;
}) {
  const showBadge = badgeCount > 0;

  return (
    <Link
      href={item.href}
      prefetch={false}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-sm font-medium",
        "transition-colors duration-150 ease-out",
        collapsed ? "h-10 w-10 justify-center self-center" : "gap-2.5 px-3 py-2",
        active
          ? "bg-primary/[0.08] text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon name={item.icon} size={20} />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {showBadge ? (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                active ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"
              )}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </>
      ) : showBadge ? (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
          aria-label={`Новых: ${badgeCount}`}
        />
      ) : null}
    </Link>
  );
}

export function SidebarNav({
  role = "student",
  collapsed = false,
}: {
  role?: RoleKey;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const counts = useUnreadCounts();
  const groups: NavGroup[] = NAV_GROUPS_BY_ROLE[role] ?? [];
  const flat = groups.flatMap((g) => g.items);
  const activeHref = getActiveNavHref(pathname, flat);

  return (
    <nav
      aria-label="Разделы кабинета"
      className={cn("flex flex-col gap-5", collapsed ? "px-2 py-3" : "p-3")}
    >
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="flex flex-col gap-0.5">
          {!collapsed && group.label ? (
            <div className="mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {group.label}
            </div>
          ) : null}
          {collapsed && groupIndex > 0 ? (
            <div className="mx-2 mb-2 border-t border-[var(--academy-line)]" aria-hidden="true" />
          ) : null}
          {group.items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={activeHref === item.href}
              badgeCount={BADGE_MAP[item.icon] ? counts[BADGE_MAP[item.icon]] ?? 0 : 0}
              collapsed={collapsed}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Полный десктопный рейл: навигация + установка PWA + переключатель сворачивания. */
export function RoleSidebar({ role = "student" }: { role?: RoleKey }) {
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <div className="shell-sidebar-rail">
      <SidebarNav role={role} collapsed={collapsed} />

      <div className="mt-auto flex flex-col gap-1 p-3 pt-2">
        <InstallAppButton collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-9 items-center rounded-lg text-muted-foreground",
            "transition-colors duration-150 hover:bg-muted hover:text-foreground",
            collapsed ? "w-10 justify-center self-center" : "gap-2.5 px-3"
          )}
        >
          <Icon
            name="chevron_right"
            size={18}
            className={cn("transition-transform duration-200", !collapsed && "rotate-180")}
          />
          {!collapsed ? <span className="text-sm font-medium">Свернуть</span> : null}
        </button>
      </div>
    </div>
  );
}

function InstallAppButton({ collapsed }: { collapsed: boolean }) {
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstallability = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
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

  if (!isInstallable) return null;

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("pwa-trigger-install"))}
      title={collapsed ? "Установить приложение" : undefined}
      className={cn(
        "flex h-9 items-center rounded-lg text-sm font-medium text-muted-foreground",
        "transition-colors duration-150 hover:bg-muted hover:text-foreground",
        collapsed ? "w-10 justify-center self-center" : "gap-2.5 px-3"
      )}
    >
      <Icon name="download" size={20} />
      {!collapsed ? <span>Установить приложение</span> : null}
    </button>
  );
}

/** Мобильный drawer со сгруппированной навигацией (все разделы роли). */
export function RoleDrawerNav({ role = "student" }: { role?: RoleKey }) {
  return <SidebarNav role={role} collapsed={false} />;
}
