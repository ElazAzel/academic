import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-primary/15 bg-primary/[0.08] text-primary",
  secondary: "border-border bg-secondary text-secondary-foreground",
  outline: "border-border bg-transparent text-muted-foreground",
  destructive: "border-destructive/15 bg-destructive/[0.08] text-destructive",
  success:
    "border-success/15 bg-success/[0.08] text-success dark:text-success dark:border-success/25",
  warning:
    "border-warning/20 bg-warning/[0.10] text-warning dark:text-warning dark:border-warning/30",
  info: "border-info/15 bg-info/[0.08] text-info dark:text-info",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 tracking-[0.01em] transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
