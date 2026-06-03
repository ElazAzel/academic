"use client";

import { useEffect } from "react";

const GLOBAL_ERROR_DESCRIPTION = "Произошла критическая ошибка приложения. Попробуйте обновить страницу.";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Global Error Boundary]", {
      message: "Критическая ошибка приложения",
      digest: error.digest,
      errorType: error.name,
    });
  }, [error]);

  return (
    <html lang="ru">
      <head>
        <title>Критическая ошибка — AI Strategic Academy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8FA] px-6 antialiased">
        <section className="relative z-10 mx-auto max-w-lg text-center">
          {/* Large 500 */}
          <p
            className="select-none text-[8rem] font-bold leading-none sm:text-[10rem]"
            style={{ color: "rgba(220,38,38,0.10)" }}
            aria-hidden
          >
            500
          </p>

          {/* Icon */}
          <div
            className="mx-auto -mt-12 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm sm:-mt-16 sm:h-24 sm:w-24"
            style={{ background: "rgba(220,38,38,0.08)" }}
          >
            <svg className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: "#DC2626" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "#1C1C1E" }}>
            Критическая ошибка
          </h1>

          <p className="mt-3 text-sm leading-relaxed sm:text-base" style={{ color: "#6B7280" }}>
            {GLOBAL_ERROR_DESCRIPTION}
          </p>

          {error.digest && (
            <p className="mt-4 text-xs" style={{ color: "rgba(107,114,128,0.6)" }}>
              Код ошибки: <code className="font-mono" style={{ color: "rgba(220,38,38,0.7)" }}>{error.digest}</code>
            </p>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium shadow-[0_8px_18px_rgba(22,63,130,0.18)] transition-all duration-150 ease-out hover:shadow-[0_10px_24px_rgba(22,63,130,0.22)] active:translate-y-px"
              style={{ background: "#1E3A5F", color: "#FFFFFF" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Обновить страницу
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
