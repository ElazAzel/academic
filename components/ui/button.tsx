import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "ghostAlt" | "danger";
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.98]",
        "max-w-full text-center leading-snug",
        variant === "primary" && [
          "bg-primary text-primary-foreground",
          "shadow-sm",
          "hover:bg-primary/90 active:bg-primary/95",
          "focus-visible:ring-primary",
        ],
        variant === "secondary" && [
          "border border-border bg-card text-foreground",
          "shadow-none",
          "hover:bg-muted hover:border-border active:bg-accent",
          "focus-visible:ring-primary",
        ],
        variant === "ghost" && [
          "bg-transparent text-foreground",
          "hover:bg-muted hover:text-primary active:bg-accent",
          "focus-visible:ring-primary",
        ],
        variant === "ghostAlt" && [
          "bg-transparent text-muted-foreground border border-border",
          "hover:bg-muted hover:text-foreground hover:border-border active:bg-accent",
          "focus-visible:ring-primary",
        ],
        variant === "danger" && [
          "bg-destructive text-destructive-foreground",
          "shadow-sm",
          "hover:bg-destructive/90 active:bg-destructive/95",
          "focus-visible:ring-destructive",
        ],
        size === "sm" && "min-h-[44px] px-3.5 py-2 text-sm md:h-9 md:min-h-0 md:py-0",
        size === "md" && "min-h-[44px] px-4 py-2 text-sm md:h-10 md:min-h-0 md:py-0",
        size === "lg" && "min-h-12 px-6 py-2.5 text-base md:h-12 md:py-0",
        size === "icon" && "h-11 w-11 p-0 md:h-10 md:w-10",
        className
      )}
      {...props}
    />
  );
}
