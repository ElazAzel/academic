import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentAssignmentsPage() {
  return (
    <AppShell role="student">
      <PageHeader title="Задания" description="Список ваших заданий." badge="Слушатель" />
      <Card className="rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-base">Задания</CardTitle>
          <CardDescription>Раздел в разработке</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Здесь будет отображаться список заданий.
        </CardContent>
      </Card>
    </AppShell>
  );
}
