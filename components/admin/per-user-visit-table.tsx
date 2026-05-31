import { EmptyState } from "@/components/lms/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPerUserVisitRows } from "@/server/modules/page-data/service";

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} ч ${m} мин`;
}

export async function PerUserVisitTable({
  days = 30,
  roleFilter,
}: {
  days?: number;
  roleFilter?: string;
}) {
  const rows = await getPerUserVisitRows(days, roleFilter);

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Админ",
      super_curator: "Супер-куратор",
      curator: "Куратор",
      instructor: "Преподаватель",
      student: "Студент",
      customer_observer: "Наблюдатель",
    };
    return labels[role] ?? role;
  };

  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
      <CardHeader>
        <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Персональная статистика</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon="group"
            title="Нет данных"
            description="За выбранный период сессии не найдены."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Сессий</TableHead>
                <TableHead className="text-right">Средняя длительность</TableHead>
                <TableHead className="text-right">Всего времени</TableHead>
                <TableHead className="text-right">Последний визит</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">{row.userName}</TableCell>
                  <TableCell>
                    <span className="rounded-md bg-m3-surface-container-high px-2 py-0.5 text-xs font-medium">
                      {roleLabel(row.role)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(row.avgDuration)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(row.totalDuration)}</TableCell>
                  <TableCell className="text-right tabular-nums text-m3-on-surface-variant">
                    {new Date(row.lastVisit).toLocaleDateString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
