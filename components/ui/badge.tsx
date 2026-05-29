import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const variantStyles: Record<BadgeVariant, string> = {
  default: "border-m3-primary/25 bg-m3-primary-fixed/45 text-m3-primary",
  secondary: "border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface-variant",
  outline: "border-m3-outline-variant bg-m3-surface-container-lowest/70 text-m3-on-surface-variant",
  destructive: "border-m3-error/30 bg-m3-error-container/60 text-m3-error",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
