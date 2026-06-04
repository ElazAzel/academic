import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-m3-surface-container-high/70 backdrop-blur-sm", className)}
      role="progressbar"
      aria-label={`Прогресс ${clampedValue}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.75)] transition-[width] duration-500 ease-out relative overflow-hidden"
        style={{ width: `${clampedValue}%` }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
