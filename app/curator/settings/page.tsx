import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRolePage } from "@/lib/auth/page-guards";

export default async function CuratorSettingsPage() {
  await requireRolePage(["curator", "super_curator"]);

  return (
    <AppShell role="curator">
      <PageHeader title="Настройки" description="Настройки профиля куратора." badge="Куратор" />
      <Card className="rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-base">Настройки</CardTitle>
          <CardDescription>Раздел в разработке</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Здесь будут отображаться настройки профиля.
        </CardContent>
      </Card>
    </AppShell>
  );
}
