"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { BOTTOM_NAV_BY_ROLE, getActiveNavHref } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";

export function MobileBottomNav({ role = "student" }: { role?: RoleKey }) {
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
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
            <div
              className={cn(
                "relative flex h-8 w-10 items-center justify-center rounded-lg transition-colors",
                isActive ? "bg-m3-primary-fixed/65" : "bg-transparent"
              )}
            >
              <Icon
                name={item.icon}
                size={20}
                className={cn(
                  "transition-colors",
                  isActive
                    ? "text-m3-primary"
                    : "text-m3-on-surface-variant"
                )}
              />
              {isActive && (
                <motion.span
                  layoutId={shouldReduce ? undefined : "bottom-nav-indicator"}
                  className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-m3-primary"
                  transition={shouldReduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-tight transition-colors",
                isActive
                  ? "text-m3-primary"
                  : "text-m3-on-surface-variant"
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
