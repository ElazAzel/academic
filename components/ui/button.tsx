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
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        // Desktop: subtle hover lift
        "md:hover:-translate-y-0.5",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        // Touch-friendly min-height on mobile
        "min-h-[44px] md:min-h-0",
        variant === "primary" && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-muted",
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
