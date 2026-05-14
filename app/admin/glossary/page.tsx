import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getGlossaryEntries } from "@/server/actions/glossary";
import { GlossaryEditor } from "./glossary-editor";

export const dynamic = "force-dynamic";

export default async function AdminGlossaryPage() {
  await requireRolePage(["admin", "super_curator"]);
  const entries = await getGlossaryEntries();

  return (
    <AppShell role="admin">
      <PageHeader title="Глоссарий" description="Управление ответами на частые вопросы кураторов." />
      <GlossaryEditor entries={entries} />
    </AppShell>
  );
}
