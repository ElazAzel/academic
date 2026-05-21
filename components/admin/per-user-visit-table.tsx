import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/lms/empty-state";

const prisma = getPrisma();

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} сек`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} ч ${m} мин`;
}

async function getPerUserData(days: number, roleFilter?: string) {
  await requireRole(["admin", "super_curator"]);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const whereBase: Record<string, unknown> = {
    startedAt: { gte: startDate },
  };
  if (roleFilter) {
    whereBase.role = roleFilter;
  }

  const sessions = await prisma.userSession.findMany({
    where: whereBase as Prisma.UserSessionWhereInput,
    select: {
      userId: true,
      role: true,
      durationSec: true,
      startedAt: true,
    },
    orderBy: { startedAt: "desc" },
  });

  // Group by user
  const userMap = new Map<
    string,
    {
      userId: string;
      role: string;
      sessions: number;
      totalDuration: number;
      durations: number[];
      lastVisit: Date;
    }
  >();

  for (const s of sessions) {
    let entry = userMap.get(s.userId);
    if (!entry) {
      entry = {
        userId: s.userId,
        role: s.role,
        sessions: 0,
        totalDuration: 0,
        durations: [],
        lastVisit: s.startedAt,
      };
      userMap.set(s.userId, entry);
    }
    entry.sessions++;
    if (s.durationSec !== null) {
      entry.totalDuration += s.durationSec;
      entry.durations.push(s.durationSec);
    }
    if (s.startedAt > entry.lastVisit) {
      entry.lastVisit = s.startedAt;
    }
  }

  // Fetch user names
  const userIds = Array.from(userMap.keys());
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const nameMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));

  // Build sorted array
  const rows = Array.from(userMap.values())
    .map((entry) => ({
      userId: entry.userId,
      userName: nameMap.get(entry.userId) ?? "Неизвестно",
      role: entry.role,
      sessions: entry.sessions,
      avgDuration: entry.durations.length > 0
        ? Math.round(entry.totalDuration / entry.durations.length)
        : 0,
      totalDuration: entry.totalDuration,
      lastVisit: entry.lastVisit.toISOString(),
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return rows;
}

export async function PerUserVisitTable({
  days = 30,
  roleFilter,
}: {
  days?: number;
  roleFilter?: string;
}) {
  const rows = await getPerUserData(days, roleFilter);

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
