"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
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
  const shouldReduce = useReducedMotion();
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
      <div
        className="relative flex gap-1 rounded-xl bg-m3-surface-container/60 p-1 backdrop-blur-sm border border-m3-outline-variant/30"
        role="tablist"
      >
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
              "relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors z-[1]",
              active === i
                ? "text-m3-on-surface"
                : "text-m3-on-surface-variant hover:text-m3-on-surface",
            )}
          >
            {active === i && (
              <motion.span
                layoutId={shouldReduce ? undefined : "tab-indicator"}
                className="absolute inset-0 rounded-lg bg-m3-surface-container-lowest shadow-m3-soft"
                style={{ zIndex: -1 }}
                transition={
                  shouldReduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 30 }
                }
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs[active]?.content}</div>
    </div>
  );
}
