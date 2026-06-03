import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspacePage({
  title,
  description,
  items = ["Курсы", "Прогресс", "Отчёты"]
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <AppShell>
      <PageHeader title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle>{item}</CardTitle>
              <CardDescription>Раздел будет показывать доступные данные и действия по роли пользователя.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
                Пока здесь нет данных для отображения.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

