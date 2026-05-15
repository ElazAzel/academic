"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ICON_MAP, BOTTOM_NAV_BY_ROLE } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";

export function MobileBottomNav({ role = "student" }: { role?: RoleKey }) {
  const pathname = usePathname();
  const items = BOTTOM_NAV_BY_ROLE[role] ?? BOTTOM_NAV_BY_ROLE.student;

  // Get unread counts from sidebar if available (NavLinks fetches them)
  // We re-use the same endpoint via a simple approach: show badge from NAV_BY_ROLE

  return (
    <nav
      className="bottom-nav-bar md:hidden"
      aria-label="Мобильная навигация"
    >
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className="bottom-nav-item relative"
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
              {Icon && (
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
              )}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-tight transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
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
