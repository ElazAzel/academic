"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, FolderOpen } from "lucide-react";
import { createGlossaryEntryAction, updateGlossaryEntryAction, deleteGlossaryEntryAction } from "@/server/actions/glossary";
import { DIRECTIONS, getDirectionLabel } from "@/lib/glossary/labels";
import { toast } from "sonner";

type Entry = { id: string; question: string; answer: string; category: string; direction: string };

export function GlossaryEditor({
  entries,
  categories,
}: {
  entries: Entry[];
  categories: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? entries.filter((e) => e.question.toLowerCase().includes(search.toLowerCase()) || e.answer.toLowerCase().includes(search.toLowerCase()))
    : entries;

  // Group by direction → category
  const groupedByDirection: Record<string, Record<string, Entry[]>> = {};
  for (const e of filtered) {
    if (!groupedByDirection[e.direction]) groupedByDirection[e.direction] = {};
    if (!groupedByDirection[e.direction][e.category]) groupedByDirection[e.direction][e.category] = [];
    groupedByDirection[e.direction][e.category].push(e);
  }

  async function handleCreate(formData: FormData) {
    setPending(true);
    try {
      await createGlossaryEntryAction(formData);
      toast.success("Запись добавлена");
      setNewForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally { setPending(false); }
  }

  async function handleUpdate(formData: FormData) {
    formData.set("id", editingId!);
    setPending(true);
    try {
      await updateGlossaryEntryAction(formData);
      toast.success("Запись обновлена");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally { setPending(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить запись?")) return;
    setPending(true);
    try {
      await deleteGlossaryEntryAction(id);
      toast.success("Запись удалена");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally { setPending(false); }
  }

  const allCats = Array.from(new Set([...categories, "Общее", "Уроки", "Тесты", "Задания", "Процесс обучения"]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setNewForm(!newForm)}>
          <Plus className="h-4 w-4 mr-1" />Добавить
        </Button>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {newForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardContent className="p-4">
            <form action={handleCreate} className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Input name="question" placeholder="Вопрос" required />
                </div>
                <select name="direction" defaultValue="general" className="rounded-xl border bg-background px-3 py-2 text-sm">
                  {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select name="category" className="rounded-xl border bg-background px-3 py-2 text-sm">
                  {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Textarea name="answer" placeholder="Ответ" rows={4} required />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewForm(false)}>Отмена</Button>
                <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Добавить"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {Object.keys(groupedByDirection).length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">Глоссарий пуст.</p>
          </CardContent>
        </Card>
      ) : Object.entries(groupedByDirection).map(([dir, categories]) => (
        <section key={dir} className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-primary border-b pb-2">
            <FolderOpen className="h-4 w-4" />
            {getDirectionLabel(dir)}
            <Badge className="bg-primary/5 text-primary border-primary/20 text-[10px] ml-1">
              {Object.values(categories).reduce((sum, arr) => sum + arr.length, 0)}
            </Badge>
          </h2>
          {Object.entries(categories).map(([cat, catEntries]) => (
            <div key={cat} className="ml-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {cat}
                <Badge className="bg-muted text-muted-foreground text-[10px]">{catEntries.length}</Badge>
              </h3>
              <div className="space-y-2">
                {catEntries.map((entry) => (
                  <Card key={entry.id} className="rounded-2xl">
                    <CardContent className="p-4">
                      {editingId === entry.id ? (
                        <form action={handleUpdate} className="space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                              <Input name="question" defaultValue={entry.question} required />
                            </div>
                            <select name="direction" defaultValue={entry.direction} className="rounded-xl border bg-background px-3 py-2 text-sm">
                              {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                            <select name="category" defaultValue={entry.category} className="rounded-xl border bg-background px-3 py-2 text-sm">
                              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <Textarea name="answer" defaultValue={entry.answer} rows={4} required />
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>Отмена</Button>
                            <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Сохранить"}</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">{getDirectionLabel(entry.direction)}</Badge>
                              <Badge className="bg-primary/5 text-primary border-primary/20 text-[10px]">{entry.category}</Badge>
                            </div>
                            <p className="text-sm font-medium">{entry.question}</p>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2">{entry.answer}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(entry.id)} aria-label="Редактировать">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-red-600" aria-label="Удалить">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
