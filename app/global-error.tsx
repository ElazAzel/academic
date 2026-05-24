"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 antialiased">
        <section className="max-w-md rounded-2xl bg-card p-8 text-center shadow-panel">
          <h1 className="text-2xl font-semibold">Критическая ошибка</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error.message || "Произошла критическая ошибка приложения. Попробуйте обновить страницу."}
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Обновить страницу
          </button>
        </section>
      </body>
    </html>
  );
}
