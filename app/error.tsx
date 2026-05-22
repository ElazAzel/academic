"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Error Boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md rounded-2xl bg-white p-8 text-center shadow-panel">
        <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "Мы сохранили контекст ошибки. Попробуйте обновить экран."}
        </p>
        <Button className="mt-6" onClick={reset}>Повторить</Button>
      </section>
    </main>
  );
}

