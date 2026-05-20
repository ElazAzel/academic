import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} aria-label={`Прогресс ${value}%`}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

