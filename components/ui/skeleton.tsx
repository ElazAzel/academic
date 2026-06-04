import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-m3-surface-container-high/50",
        "bg-gradient-to-r from-m3-surface-container-high/50 via-m3-surface-container/30 to-m3-surface-container-high/50",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}
