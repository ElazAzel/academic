import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getMyConversations } from "@/server/actions/chat";
import { CuratorChatList } from "./chat-list";

export const dynamic = "force-dynamic";

export default async function CuratorChatPage() {
  await requireRolePage(["curator", "super_curator", "admin"]);
  const conversations = await getMyConversations();

  return (
    <AppShell role="curator">
      <PageHeader title="Сообщения" description="Диалоги со слушателями." />
      <CuratorChatList conversations={conversations} />
    </AppShell>
  );
}
