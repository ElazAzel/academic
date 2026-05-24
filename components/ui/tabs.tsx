"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

function labelToValue(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export function Tabs({
  tabs,
  defaultIndex = 0,
  paramName,
  className,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  defaultIndex?: number;
  paramName?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [localActive, setLocalActive] = useState(defaultIndex);

  let active: number;
  if (paramName) {
    const value = searchParams.get(paramName);
    if (value) {
      const idx = tabs.findIndex((t) => labelToValue(t.label) === value);
      active = idx >= 0 ? idx : defaultIndex;
    } else {
      active = defaultIndex;
    }
  } else {
    active = localActive;
  }

  return (
    <div className={className}>
      <div className="flex gap-1 rounded-lg bg-muted/60 p-1" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            aria-selected={active === i}
            onClick={() => {
              if (paramName) {
                const params = new URLSearchParams(searchParams.toString());
                params.set(paramName, labelToValue(tab.label));
                router.replace(`?${params.toString()}`, { scroll: false });
              } else {
                setLocalActive(i);
              }
            }}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              active === i
                ? "bg-background text-foreground shadow-sm"
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
