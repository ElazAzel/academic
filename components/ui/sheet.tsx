"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: DialogPrimitive.DialogContentProps & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        )}
      />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed top-0 z-50 flex h-full w-full max-w-xs flex-col bg-m3-surface-container-lowest/95 backdrop-blur-xl shadow-m3-modal duration-300",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "left"
            ? "left-0 rounded-r-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
            : "right-0 rounded-l-2xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">Панель</DialogPrimitive.Title>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1.5 text-m3-on-surface-variant/60 transition-all hover:bg-m3-surface-container-high hover:text-m3-on-surface">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
