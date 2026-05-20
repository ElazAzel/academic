import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { buildMessagePreview } from "@/lib/chat/utils";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const prisma = getPrisma();

/**
 * Супер-куратор видит все чаты кураторов (read-only обзор).
 * Показывает: кто из кураторов с кем ведёт диалог, последнее сообщение.
 */
export default async function SuperCuratorChatPage() {
  const user = await requireRolePage(["super_curator"]);

  // Получаем всех кураторов и их последние сообщения
  const curatorAssignments = await prisma.curatorAssignment.findMany({
    where: { active: true, superCuratorId: user.id },
    include: {
      curator: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, name: true, email: true } },
    },
    take: QUERY_LIMITS.dashboardStudents,
  });

  // Для каждой пары куратор-слушатель получаем последнее сообщение
  const curatorIds = [...new Set(curatorAssignments.map((assignment) => assignment.curatorId))];
  const studentIds = [...new Set(curatorAssignments.map((assignment) => assignment.studentId))];
  const curatorIdSet = new Set(curatorIds);
  const studentIdSet = new Set(studentIds);
  const assignmentPairKeys = new Set(curatorAssignments.map((assignment) => `${assignment.curatorId}:${assignment.studentId}`));

  const [messages, unreadCounts] = curatorIds.length === 0 || studentIds.length === 0
    ? [[], []] as const
    : await Promise.all([
        prisma.message.findMany({
          where: {
            OR: [
              { senderId: { in: curatorIds }, receiverId: { in: studentIds } },
              { senderId: { in: studentIds }, receiverId: { in: curatorIds } },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { text: true, createdAt: true, senderId: true, receiverId: true, attachmentUrl: true },
          take: QUERY_LIMITS.reportRows,
        }),
        prisma.message.groupBy({
          by: ["senderId", "receiverId"],
          where: {
            senderId: { in: studentIds },
            receiverId: { in: curatorIds },
            readAt: null,
          },
          _count: { _all: true },
        }),
      ]);

  const lastMessageByPair = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    const curatorId = curatorIdSet.has(message.senderId)
      ? message.senderId
      : message.receiverId && curatorIdSet.has(message.receiverId)
        ? message.receiverId
        : null;
    const studentId = studentIdSet.has(message.senderId)
      ? message.senderId
      : message.receiverId && studentIdSet.has(message.receiverId)
        ? message.receiverId
        : null;
    if (!curatorId || !studentId) continue;
    const key = `${curatorId}:${studentId}`;
    if (assignmentPairKeys.has(key) && !lastMessageByPair.has(key)) {
      lastMessageByPair.set(key, message);
    }
  }

  const unreadByPair = new Map(
    unreadCounts.map((row) => [`${row.receiverId}:${row.senderId}`, row._count._all]),
  );

  const pairs = curatorAssignments.map((assignment) => {
    const key = `${assignment.curatorId}:${assignment.studentId}`;
    const lastMsg = lastMessageByPair.get(key);
    return {
      curatorId: assignment.curatorId,
      curatorName: assignment.curator.name ?? assignment.curator.email,
      studentId: assignment.studentId,
      studentName: assignment.student.name ?? assignment.student.email,
      lastMessage: lastMsg ? buildMessagePreview(lastMsg.text ?? "", Boolean(lastMsg.attachmentUrl)) : null,
      lastDate: lastMsg?.createdAt?.toISOString() ?? null,
      lastSenderId: lastMsg?.senderId ?? null,
      unread: unreadByPair.get(key) ?? 0,
    };
  });

  // Сортировка: сначала с непрочитанными, потом по дате
  const sorted = pairs.sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (a.unread === 0 && b.unread > 0) return 1;
    if (!a.lastDate) return 1;
    if (!b.lastDate) return -1;
    return b.lastDate.localeCompare(a.lastDate);
  });

  // Группировка по куратору
  const byCurator = new Map<string, typeof sorted>();
  for (const pair of sorted) {
    const list = byCurator.get(pair.curatorId) ?? [];
    list.push(pair);
    byCurator.set(pair.curatorId, list);
  }

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Чат кураторов"
        description="Обзор всех диалогов кураторов со слушателями (только просмотр)."
      />

      {byCurator.size === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <MessageCircle className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p>Нет активных чатов</p>
        </div>
      )}

      <div className="space-y-6">
        {Array.from(byCurator.entries()).map(([curatorId, chats]) => (
          <div key={curatorId} className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              {chats[0].curatorName}
              <Badge variant="secondary" className="text-[10px]">
                {chats.length} {chats.length === 1 ? "диалог" : "диалогов"}
              </Badge>
            </h3>

            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={`${chat.curatorId}-${chat.studentId}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{chat.studentName}</p>
                    {chat.lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {chat.lastSenderId === chat.curatorId ? "Куратор: " : "Слушатель: "}
                        {chat.lastMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Нет сообщений</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {chat.lastDate && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(chat.lastDate).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {chat.unread > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground text-[10px] min-w-[20px] justify-center">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
