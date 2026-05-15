import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StudentAnalyticsDetail } from "@/types/domain";

function daysSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  return `${days} дн. назад`;
}

export function StudentAnalyticsTable({ students }: { students: StudentAnalyticsDetail[] }) {
  if (students.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Нет данных по слушателям
      </div>
    );
  }

  const total = students.length;
  const completed = students.filter((s) => s.progressStatus === "COMPLETED").length;
  const avgProgress = Math.round(students.reduce((s, c) => s + c.coursePercent, 0) / total);
  const withRisks = students.filter((s) => s.riskCount > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">Всего: <strong>{total}</strong></span>
        <span className="text-muted-foreground">Завершили: <strong>{completed}</strong></span>
        <span className="text-muted-foreground">Средний прогресс: <strong>{avgProgress}%</strong></span>
        <span className="text-muted-foreground">С рисками: <strong>{withRisks}</strong></span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слушатель</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Поток</TableHead>
              <TableHead>Прогресс</TableHead>
              <TableHead>Модуль</TableHead>
              <TableHead>Блок</TableHead>
              <TableHead>Урок</TableHead>
              <TableHead>Последний вход</TableHead>
              <TableHead>Ср. время/урок</TableHead>
              <TableHead>Риски</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{s.courseTitle}</TableCell>
                <TableCell className="text-sm">{s.cohortName ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${s.coursePercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{s.coursePercent}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm max-w-[140px] truncate" title={s.moduleTitle ?? ""}>
                  {s.moduleTitle ?? "—"}
                </TableCell>
                <TableCell className="text-sm max-w-[140px] truncate" title={s.blockTitle ?? ""}>
                  {s.blockTitle ?? "—"}
                </TableCell>
                <TableCell className="text-sm max-w-[140px] truncate" title={s.lessonTitle ?? ""}>
                  {s.lessonTitle ?? "—"}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {s.lastLoginAt ? daysSince(s.lastLoginAt) : "никогда"}
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {s.avgLessonMinutes > 0 ? `${s.avgLessonMinutes} мин` : "—"}
                </TableCell>
                <TableCell>
                  {s.riskCount > 0 ? (
                    <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 text-xs">{s.riskCount}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
