"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ERROR_DESCRIPTION = "Мы уже получили сигнал об ошибке. Попробуйте обновить страницу.";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Error Boundary]", {
      message: "Ошибка клиентского рендера",
      digest: error.digest,
      errorType: error.name,
    });
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <section className="relative z-10 mx-auto max-w-lg text-center">
        {/* Large error code */}
        <p className="select-none text-[8rem] font-bold leading-none text-destructive/10 sm:text-[10rem]"
           aria-hidden>
          500
        </p>

        {/* Icon */}
        <div className="mx-auto -mt-12 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 shadow-sm sm:-mt-16 sm:h-24 sm:w-24">
          <AlertTriangle className="h-8 w-8 text-destructive sm:h-10 sm:w-10" aria-hidden />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Что-то пошло не так
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {ERROR_DESCRIPTION}
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground/60">
            Код ошибки: <code className="font-mono text-destructive/70">{error.digest}</code>
          </p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Повторить
          </Button>
        </div>
      </section>
    </main>
  );
}
