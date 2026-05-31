import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorChatPageData } from "@/server/modules/page-data/service";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export const metadata = {
  title: "Чат — Супер-куратор",
  description: "Общение с кураторами и студентами.",
};


export const dynamic = "force-dynamic";

/**
 * Супер-куратор видит все чаты кураторов (read-only обзор).
 * Показывает: кто из кураторов с кем ведёт диалог, последнее сообщение.
 */
export default async function SuperCuratorChatPage() {
  const user = await requireRolePage(["super_curator"]);

  // Получаем всех кураторов и их последние сообщения
  const byCurator = await getSuperCuratorChatPageData(user.id);

  // Для каждой пары куратор-слушатель получаем последнее сообщение
  // Сортировка: сначала с непрочитанными, потом по дате
  // Группировка по куратору
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
          <div key={curatorId} className="rounded-lg border bg-card p-4">
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
                  key={`${chat.curatorId}:${chat.studentId}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-background/40"
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
