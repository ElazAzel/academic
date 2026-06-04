import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest/80 px-4 py-3 text-sm text-m3-on-surface outline-none",
        "backdrop-blur-sm",
        "transition-all duration-200",
        "placeholder:text-muted-foreground/60",
        "focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.06)] resize-y",
        className
      )}
      {...props}
    />
  );
}
