import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InstructorQuestionsPage() {
  return (
    <AppShell role="instructor">
      <PageHeader title="Вопросы от кураторов" description="Список вопросов." badge="Преподаватель" />
      <Card className="rounded-2xl mt-6">
        <CardHeader>
          <CardTitle className="text-base">Вопросы</CardTitle>
          <CardDescription>Раздел в разработке</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Здесь будут отображаться вопросы от кураторов.
        </CardContent>
      </Card>
    </AppShell>
  );
}
