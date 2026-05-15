import { cn } from "@/lib/utils";

interface BarItem {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  sublabel?: string;
}

export function BarChart({
  items,
  className,
}: {
  items: BarItem[];
  className?: string;
}) {
  const chartMax = Math.max(...items.map((i) => i.maxValue ?? i.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = Math.round((item.value / chartMax) * 100);
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="ml-2 text-xs text-muted-foreground">{item.sublabel}</span>
                )}
              </div>
              <span className="font-medium tabular-nums">{item.value}</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color,
                  backgroundImage:
                    item.color === "#16a34a"
                      ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)"
                      : item.color === "#dc2626"
                      ? "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)"
                      : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  label,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">
        {label ?? `${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}
