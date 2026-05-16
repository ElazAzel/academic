import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const prisma = getPrisma();

/**
 * Супер-куратор видит все чаты кураторов (read-only обзор).
 * Показывает: кто из кураторов с кем ведёт диалог, последнее сообщение.
 */
export default async function SuperCuratorChatPage() {
  await requireRolePage(["super_curator"]);

  // Получаем всех кураторов и их последние сообщения
  const curatorAssignments = await prisma.curatorAssignment.findMany({
    where: { active: true },
    include: {
      curator: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  });

  // Для каждой пары куратор-слушатель получаем последнее сообщение
  const pairs = await Promise.all(
    curatorAssignments.map(async (a) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: a.curatorId, receiverId: a.studentId },
            { senderId: a.studentId, receiverId: a.curatorId },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          text: true,
          createdAt: true,
          senderId: true,
        },
      });

      const unreadCount = await prisma.message.count({
        where: {
          senderId: a.studentId,
          receiverId: a.curatorId,
          readAt: null,
        },
      });

      return {
        curatorId: a.curatorId,
        curatorName: a.curator.name ?? a.curator.email,
        studentId: a.studentId,
        studentName: a.student.name ?? a.student.email,
        lastMessage: lastMsg?.text ?? null,
        lastDate: lastMsg?.createdAt?.toISOString() ?? null,
        lastSenderId: lastMsg?.senderId ?? null,
        unread: unreadCount,
      };
    })
  );

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
                <Link
                  key={`${chat.curatorId}-${chat.studentId}`}
                  href={`/curator/chat?studentId=${chat.studentId}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
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
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
