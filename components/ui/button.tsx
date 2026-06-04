import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
};

export function Button({ className, variant = "primary", size = "md", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
        "transition-all duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.97]",
        "max-w-full text-center leading-snug",
        variant === "primary" && [
          "bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.9)]",
          "text-primary-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(26,68,148,0.20),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_8px_20px_rgba(26,68,148,0.28),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:brightness-110",
          "focus-visible:ring-primary",
        ],
        variant === "secondary" && [
          "border border-m3-outline-variant/70 bg-m3-surface-container-lowest/80 text-m3-on-surface",
          "shadow-m3-soft",
          "backdrop-blur-sm",
          "hover:border-m3-primary/25 hover:bg-m3-surface-container-low hover:shadow-m3-soft-hover",
          "focus-visible:ring-primary",
        ],
        variant === "ghost" && [
          "bg-transparent text-m3-on-surface",
          "hover:bg-m3-surface-container-low/80 hover:text-m3-primary",
          "focus-visible:ring-primary",
        ],
        variant === "danger" && [
          "bg-gradient-to-b from-destructive to-[hsl(var(--destructive)/0.9)]",
          "text-destructive-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(198,40,40,0.18)]",
          "hover:shadow-[0_2px_4px_rgba(0,0,0,0.12),0_8px_20px_rgba(198,40,40,0.24)]",
          "hover:brightness-110",
          "focus-visible:ring-destructive",
        ],
        size === "sm" && "min-h-[44px] px-3.5 py-2 text-sm md:h-9 md:min-h-0 md:py-0",
        size === "md" && "min-h-[44px] px-4.5 py-2 text-sm md:h-10 md:min-h-0 md:py-0",
        size === "lg" && "min-h-12 px-6 py-2.5 text-base md:h-12 md:py-0",
        size === "icon" && "h-11 w-11 p-0 md:h-10 md:w-10",
        className
      )}
      {...props}
    />
  );
}
