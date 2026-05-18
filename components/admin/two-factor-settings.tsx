"use client";

import dynamic from "next/dynamic";

const TwoFactorSetup = dynamic(
  () => import("@/components/admin/two-factor-setup"),
  { ssr: false, loading: () => <div className="p-4 text-sm text-muted-foreground">Загрузка...</div> },
);

export function TwoFactorSettings() {
  return (
    <div className="mt-6 border-t pt-6">
      <TwoFactorSetup />
    </div>
  );
}
