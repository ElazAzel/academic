"use client";

import { useEffect, useState } from "react";
import { X, Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PopupData {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  viewed: boolean;
}

export function PopupModal() {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [open, setOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    fetchPopup();
  }, []);

  async function fetchPopup() {
    try {
      const res = await fetch("/api/v1/popups/active");
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) return;
        const json = await res.json();
        if (json.data) {
          setPopup(json.data);
          setOpen(true);
        }
      }
    } catch {
      // Silently ignore popup fetch errors
    }
  }

  async function handleAcknowledge() {
    if (!popup) return;
    setAcknowledging(true);
    try {
      await fetch("/api/v1/popups/acknowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ popupId: popup.id }),
      });
      setOpen(false);
    } catch (err) {
      console.error("[PopupModal] Failed to acknowledge popup:", err);
    } finally {
      setAcknowledging(false);
    }
  }

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">{popup.title}</DialogTitle>
              <DialogDescription className="sr-only">{popup.message}</DialogDescription>
            </div>
          </div>

          {/* Image */}
          {popup.imageUrl && (
            <div className="px-6 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={popup.imageUrl}
                alt={popup.title}
                className="w-full rounded-xl object-cover max-h-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Message */}
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {popup.message}
            </p>
          </div>

          {/* Link */}
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="min-w-[120px]"
            >
              {acknowledging ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Отправка…
                </span>
              ) : (
                "Принято"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
