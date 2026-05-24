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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "min-h-[44px] md:min-h-0",
        variant === "primary" && "bg-m3-primary text-m3-on-primary hover:bg-m3-primary-container",
        variant === "secondary" && "border border-m3-outline-variant bg-m3-surface-container-lowest text-m3-on-surface hover:bg-m3-surface-container-low",
        variant === "ghost" && "bg-transparent text-m3-on-surface hover:bg-m3-surface-container-low",
        variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm md:h-10",
        size === "lg" && "h-12 px-5 text-base",
        size === "icon" && "h-11 w-11 p-0 md:h-10 md:w-10",
        className
      )}
      {...props}
    />
  );
}
