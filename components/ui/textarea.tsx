import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground",
        "focus:border-primary focus:ring-4 focus:ring-primary/10 resize-y",
        className
      )}
      {...props}
    />
  );
}
