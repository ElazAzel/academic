import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground",
        "focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y",
        className
      )}
      {...props}
    />
  );
}
