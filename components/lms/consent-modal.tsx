"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { getSafeClientErrorMetadata } from "@/lib/client-error";

interface ConsentStatus {
  consented: boolean;
}

export function ConsentModal() {
  const { data: session, status: sessionStatus } = useSession();
  const [consented, setConsented] = useState(true);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const checkConsent = useCallback(async () => {
    if (sessionStatus !== "authenticated" || !session?.user) return;
    try {
      const res = await fetch("/api/v1/consent/status");
      if (res.ok) {
        const json: { data: ConsentStatus } = await res.json();
        if (!json.data.consented) {
          setConsented(false);
          setOpen(true);
        }
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [sessionStatus, session?.user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkConsent();
  }, [checkConsent]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch("/api/v1/consent/accept", { method: "POST" });
      if (res.ok) {
        setConsented(true);
        setOpen(false);
        return;
      }
      console.error("[ConsentModal] Failed to accept consent", { statusCode: res.status });
      toast.error("Не удалось подтвердить согласие");
    } catch (err) {
      console.error("[ConsentModal] Failed to accept consent", getSafeClientErrorMetadata(err));
      toast.error("Не удалось подтвердить согласие");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || consented || sessionStatus !== "authenticated") return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !consented) return; setOpen(v); }}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="bg-m3-surface-container-lowest">
          <div className="flex items-center gap-3 p-6 pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Юридические документы</DialogTitle>
              <DialogDescription className="sr-only">
                Подтверждение ознакомления с документами платформы
              </DialogDescription>
            </div>
          </div>

          <div className="px-6 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Продолжая использовать платформу, вы подтверждаете, что
              ознакомились и принимаете:
            </p>

            <ul className="space-y-2">
              <li>
                <a
                  href="/docs/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Политика конфиденциальности
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="/docs/terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Пользовательское соглашение
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="/docs/cookie-notice"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Уведомление об использовании cookie
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground">
              Ваше согласие фиксируется в журнале согласий. Вы можете отозвать
              согласие на обработку данных в любое время через обращение к
              администратору.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t bg-muted/30 px-6 py-4">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="min-w-[160px]"
            >
              {accepting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Отправка…
                </span>
              ) : (
                "Принимаю условия"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
