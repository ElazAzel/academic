import { AppShell } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/lms/page-skeleton";

export default function Loading() {
  return (
    <AppShell role="admin">
      <PageSkeleton />
    </AppShell>
  );
}