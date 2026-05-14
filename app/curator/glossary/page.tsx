import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getGlossaryEntries } from "@/server/actions/glossary";

export const dynamic = "force-dynamic";

export default async function CuratorGlossaryPage() {
  await requireRolePage(["curator", "super_curator", "admin"]);
  const entries = await getGlossaryEntries();

  return (
    <AppShell role="curator">
      <PageHeader title="Глоссарий" description="Быстрые ответы на частые вопросы слушателей." />
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Поиск по глоссарию..." />
        </div>
        {entries.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-muted-foreground">
              <p className="text-sm">Глоссарий пока пуст. Администратор или супер-куратор может добавить записи.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <details key={entry.id} className="rounded-2xl border group">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium hover:bg-muted/30 rounded-2xl transition-colors">
                  {entry.question}
                </summary>
                <div className="border-t px-5 py-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {entry.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
