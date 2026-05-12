"use client";

import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ICON_MAP } from "@/components/layout/navigation";
import type { NavItem } from "@/components/layout/navigation";
import type { RoleKey } from "@/types/domain";
import { ROLE_LABELS } from "@/types/domain";

export function MobileNav({
  links,
  role,
}: {
  links: NavItem[];
  role: RoleKey;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="flex items-center gap-2 px-4 pt-6 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">AI Strategic Academy</span>
        </div>
        <div className="px-3 pb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {ROLE_LABELS[role]}
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Мобильная навигация">
          {links.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            AI Strategic Academy &mdash; {new Date().getFullYear()}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
