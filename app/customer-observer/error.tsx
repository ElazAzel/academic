"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageError } from "@/components/lms/page-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <PageError error={error} reset={reset} />
    </AppShell>
  );
}