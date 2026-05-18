import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getMyConversations } from "@/server/actions/chat";
import { checkUnansweredMessages } from "@/server/actions/chat-reminder";
import { CuratorChatList } from "@/app/curator/chat/chat-list";

export const dynamic = "force-dynamic";

export default async function InstructorChatPage() {
  await requireRolePage(["instructor"]);
  const conversations = await getMyConversations();

  // Проверка неотвеченных сообщений при заходе на страницу
  await checkUnansweredMessages();

  return (
    <AppShell role="instructor">
      <PageHeader title="Сообщения" description="Диалоги с кураторами и слушателями." />
      <CuratorChatList conversations={conversations} />
    </AppShell>
  );
}
