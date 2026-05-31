import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-label={`Прогресс ${clampedValue}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
    >
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${clampedValue}%` }} />
    </div>
  );
}
