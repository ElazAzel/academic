import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getMyConversations } from "@/server/actions/chat";
import { CuratorChatList } from "@/app/curator/chat/chat-list";

export const dynamic = "force-dynamic";

export default async function InstructorChatPage() {
  await requireRolePage(["instructor"]);

  let conversations: Awaited<ReturnType<typeof getMyConversations>> = [];
  try {
    conversations = await getMyConversations();
  } catch {
    // graceful fallback
  }

  return (
    <AppShell role="instructor">
      <PageHeader title="Сообщения" description="Диалоги с кураторами и слушателями." />
      <CuratorChatList conversations={conversations} />
    </AppShell>
  );
}
