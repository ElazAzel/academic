import { AppShell } from "@/components/layout/app-shell";
import { requireRolePage } from "@/lib/auth/page-guards";
import { AttendanceDashboard } from "./client";

export const dynamic = "force-dynamic";

export default async function InstructorAttendancePage() {
  await requireRolePage(["instructor", "admin"]);
  return (
    <AppShell role="instructor">
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-md font-headline-md text-m3-on-surface">Посещаемость</h1>
          <p className="text-body-md font-body-md text-m3-on-surface-variant">
            Статистика просмотров уроков студентами
          </p>
        </div>
        <AttendanceDashboard />
      </div>
    </AppShell>
  );
}
