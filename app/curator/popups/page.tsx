import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorPopupStudents } from "@/server/modules/page-data/service";
import { CuratorPopupClient } from "./client";

export const metadata = {
  title: "Всплывающие окна — Куратор",
  description: "Управление всплывающими окнами.",
};


export const dynamic = "force-dynamic";

export default async function CuratorPopupsPage() {
  const user = await requireRolePage(["curator"]);

  const students = await getCuratorPopupStudents(user.id);

  return (
    <AppShell role="curator">
      <PageHeader
        title="Уведомления слушателям"
        description="Создавайте всплывающие уведомления для своих слушателей."
      />
      <div className="mt-6">
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              У вас нет закреплённых слушателей.
            </CardContent>
          </Card>
        ) : (
          <CuratorPopupClient students={students} curatorId={user.id} />
        )}
      </div>
    </AppShell>
  );
}
