"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  defaultIndex = 0,
  className,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  defaultIndex?: number;
  className?: string;
}) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div className={className}>
      <div className="flex gap-1 rounded-xl bg-muted/60 p-1" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              active === i
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs[active]?.content}</div>
    </div>
  );
}
