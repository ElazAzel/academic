import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
              <Badge className="w-fit">MVP</Badge>
              <CardTitle>{item}</CardTitle>
              <CardDescription>Экран готов как production scaffold с REST-контрактами и пустыми состояниями.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed bg-muted/40 p-5 text-sm text-muted-foreground">
                Данные подключаются через server modules и React Query без прямого доступа UI к базе.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

