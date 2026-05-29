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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:ring-offset-2 focus-visible:ring-offset-m3-background",
        "active:translate-y-px",
        "max-w-full text-center leading-snug",
        variant === "primary" && "bg-m3-primary text-m3-on-primary shadow-[0_8px_18px_rgba(22,63,130,0.18)] hover:bg-m3-primary-container hover:shadow-[0_10px_24px_rgba(22,63,130,0.22)]",
        variant === "secondary" && "border border-m3-outline-variant bg-m3-surface-container-lowest text-m3-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-m3-primary/30 hover:bg-m3-surface-container-low",
        variant === "ghost" && "bg-transparent text-m3-on-surface hover:bg-m3-surface-container-low hover:text-m3-primary",
        variant === "danger" && "bg-destructive text-destructive-foreground shadow-[0_8px_18px_rgba(185,28,28,0.16)] hover:bg-destructive/90",
        size === "sm" && "min-h-[44px] px-3 py-2 text-sm md:h-9 md:min-h-0 md:py-0",
        size === "md" && "min-h-[44px] px-4 py-2 text-sm md:h-10 md:min-h-0 md:py-0",
        size === "lg" && "min-h-12 px-5 py-2.5 text-base md:h-12 md:py-0",
        size === "icon" && "h-11 w-11 p-0 md:h-10 md:w-10",
        className
      )}
      {...props}
    />
  );
}
