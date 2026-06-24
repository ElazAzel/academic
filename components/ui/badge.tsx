import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-m3-primary/20 bg-m3-primary-fixed/35 text-m3-primary backdrop-blur-sm",
  secondary: "border-m3-outline-variant/60 bg-m3-surface-container-low/80 text-m3-on-surface-variant backdrop-blur-sm",
  outline: "border-m3-outline-variant/50 bg-m3-surface-container-lowest/60 text-m3-on-surface-variant backdrop-blur-sm",
  destructive: "border-m3-error/20 bg-m3-error-container/40 text-m3-error backdrop-blur-sm",
  success: "border-emerald-300/30 bg-emerald-50/60 text-emerald-700 backdrop-blur-sm dark:border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-400",
  warning: "border-amber-300/30 bg-amber-50/60 text-amber-700 backdrop-blur-sm dark:border-amber-700/30 dark:bg-amber-950/30 dark:text-amber-400",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-510 leading-5 transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
