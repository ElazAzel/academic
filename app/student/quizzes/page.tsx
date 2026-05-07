import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentQuizzesPage() {
  return (
    <AppShell role="student">
      <PageHeader title="Тесты" description="Список доступных и пройденных тестов." badge="Слушатель" />
      <Card className="rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-base">Тесты</CardTitle>
          <CardDescription>Раздел в разработке</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Здесь будет отображаться список ваших тестов.
        </CardContent>
      </Card>
    </AppShell>
  );
}
