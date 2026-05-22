"use client";

import { PageError } from "@/components/lms/page-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh bg-m3-surface px-4 py-10">
      <PageError error={error} reset={reset} />
    </main>
  );
}
