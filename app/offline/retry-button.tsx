"use client";

import { RefreshCw } from "lucide-react";

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/92 active:scale-[0.97]"
    >
      <RefreshCw className="h-4 w-4" />
      Попробовать снова
    </button>
  );
}
