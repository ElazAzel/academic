import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardUnavailable() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex flex-col gap-3 py-8 text-amber-950 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold">Данные кабинета временно недоступны</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-900">
            Проверьте подключение PostgreSQL, миграции и seed в окружении деплоя. В production фейковые данные отключены.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
