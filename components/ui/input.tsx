import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest/80 px-4 text-sm text-m3-on-surface outline-none",
        "backdrop-blur-sm",
        "transition-all duration-200",
        "placeholder:text-muted-foreground/60",
        "focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.06)]",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15",
        className
      )}
      {...props}
    />
  );
}
