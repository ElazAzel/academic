import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";

export default async function AdminPaymentsPage() {
  await requireRolePage(["admin"]);

  return (
    <AppShell role="admin">
      <PageHeader title="Инвайт-доступ" description="Платформа использует инвайты и назначенные логины для доступа." badge="Администратор" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Link2 className="h-8 w-8 opacity-40" />
          <p>Управление инвайтами доступно в разделе «Инвайты» основного дашборда.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
