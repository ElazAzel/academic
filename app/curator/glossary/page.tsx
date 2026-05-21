import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getGlossaryEntries, getGlossaryCategories } from "@/server/actions/glossary";
import { EmptyState } from "@/components/lms/empty-state";

export const dynamic = "force-dynamic";

export default async function CuratorGlossaryPage(props: {
  searchParams?: Promise<{ search?: string; category?: string }>;
}) {
  await requireRolePage(["curator", "super_curator", "admin"]);
  const sp = await props.searchParams;
  const search = sp?.search ?? "";
  const categoryFilter = sp?.category ?? "";
  const allEntries = await getGlossaryEntries(search || undefined);
  const categories = await getGlossaryCategories();

  const entries = categoryFilter ? allEntries.filter((e) => e.category === categoryFilter) : allEntries;
  const grouped: Record<string, typeof entries> = {};
  for (const e of entries) {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  }

  return (
    <AppShell role="curator">
      <PageHeader title="Глоссарий" description="Быстрые ответы на частые вопросы слушателей." />

      {/* Search */}
      <form className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" name="search" defaultValue={search} placeholder="Поиск по глоссарию..." />
      </form>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <a href={`/curator/glossary${search ? `?search=${search}` : ""}`}
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!categoryFilter ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
          Все
        </a>
        {categories.map((cat) => (
          <a key={cat} href={`/curator/glossary?category=${cat}${search ? `&search=${search}` : ""}`}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoryFilter === cat ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            {cat}
          </a>
        ))}
      </div>

      {/* Entries */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState icon="menu_book" title="Глоссарий пока пуст" description="Здесь появятся частые термины после их добавления администратором." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catEntries]) => (
            <section key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                {category}
                <Badge className="bg-primary/5 text-primary border-primary/20 text-[10px]">{catEntries.length}</Badge>
              </h3>
              <div className="space-y-2">
                {catEntries.map((entry) => (
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
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
