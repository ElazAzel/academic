import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Базовая карточка: solid surface + hairline border, без hover-lift.
 * Подъём/подсветка — только у явно интерактивных карточек (variant="interactive").
 */
export function Card({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "interactive" | "flat" }) {
  return (
    <div
      className={cn(
        "rounded-xl border text-card-foreground",
        variant === "flat"
          ? "border-transparent bg-muted/40 shadow-none"
          : [
              "border-[var(--academy-line)] bg-card",
              variant === "interactive" &&
                "transition-[box-shadow,border-color] duration-200 ease-out hover:border-primary/25 hover:shadow-card-hover",
            ],
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-headline-sm font-headline-sm tracking-tight text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-sm font-body-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-[var(--academy-line)] px-5 py-4",
        className
      )}
      {...props}
    />
  );
}
