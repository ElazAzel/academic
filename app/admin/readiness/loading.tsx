import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/lms/page-skeleton";

export default function AdminReadinessLoading() {
  return (
    <AppShell role="admin">
      <PageSkeleton />
    </AppShell>
  );
}
