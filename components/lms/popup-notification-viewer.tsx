"use client";

import { X, Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PopupViewData {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkText?: string | null;
  notificationTitle?: string;
}

export function PopupNotificationViewer({
  popup,
  open,
  onClose,
}: {
  popup: PopupViewData | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-m3-surface-container-lowest">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">{popup.title}</DialogTitle>
              <DialogDescription className="sr-only">
                {popup.notificationTitle ?? popup.title}
              </DialogDescription>
            </div>
          </div>

          {/* Image */}
          {popup.imageUrl && (
            <div className="px-6 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={popup.imageUrl}
                alt={popup.title}
                className="w-full rounded-lg object-cover max-h-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Message (полный текст из body уведомления) */}
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {popup.body}
            </p>
          </div>

          {/* External link */}
          {popup.linkUrl && (
            <div className="px-6 pb-4">
              <a
                href={popup.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {popup.linkText || "Подробнее"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Accept button */}
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button onClick={onClose} className="min-w-[120px]">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
