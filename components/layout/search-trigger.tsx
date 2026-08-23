"use client";

import { Icon } from "@/components/ui/icon";

export function SearchTrigger() {
  return (
    <button
      onClick={() => document.dispatchEvent(new CustomEvent("command-palette:open"))}
      className={[
        "mx-4 hidden h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-lg",
        "border border-border bg-muted/50 px-3 text-sm text-muted-foreground",
        "transition-colors duration-150 hover:bg-muted",
        "md:flex",
      ].join(" ")}
      aria-label="Поиск по платформе, Ctrl+K"
    >
      <Icon name="search" size={16} />
      <span className="hidden lg:inline">Поиск</span>
      <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
        Ctrl K
      </kbd>
    </button>
  );
}
