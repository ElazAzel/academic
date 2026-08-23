"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BOTTOM_NAV_BY_ROLE, getActiveNavHref } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";

export function MobileBottomNav({ role = "student" }: { role?: RoleKey }) {
  const pathname = usePathname();
  const items = BOTTOM_NAV_BY_ROLE[role] ?? BOTTOM_NAV_BY_ROLE.student;
  const activeHref = getActiveNavHref(pathname, items);

  return (
    <nav
      className="bottom-nav-bar lg:hidden"
      aria-label="Мобильная навигация"
    >
      {items.map((item) => {
        const isActive = activeHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="bottom-nav-item relative"
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "relative flex h-8 items-center justify-center rounded-lg px-4 transition-colors duration-150",
                isActive ? "bg-primary/[0.09]" : "bg-transparent"
              )}
            >
              <Icon
                name={item.icon}
                size={20}
                fill={isActive}
                className={cn(
                  "transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </span>
            <span
              className={cn(
                "text-[10px] leading-tight transition-colors duration-150",
                isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
