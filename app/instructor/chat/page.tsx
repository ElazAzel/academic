import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getMyConversations } from "@/server/actions/chat";
import { CuratorChatList } from "@/app/curator/chat/chat-list";

export const dynamic = "force-dynamic";

export default async function InstructorChatPage() {
  await requireRolePage(["instructor"]);

  let conversations: Awaited<ReturnType<typeof getMyConversations>> = [];
  let hasError = false;
  try {
    conversations = await getMyConversations();
  } catch (e) {
    hasError = true;
    console.error("[InstructorChat] Failed to fetch conversations:", e);
  }

  return (
    <AppShell role="instructor">
      <PageHeader title="Сообщения" description="Диалоги с кураторами и слушателями." />
      {hasError && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Не удалось загрузить диалоги. Проверьте подключение к базе данных.
        </div>
      )}
      <CuratorChatList conversations={conversations} />
    </AppShell>
  );
}
