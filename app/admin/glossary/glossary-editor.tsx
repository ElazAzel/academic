"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createGlossaryEntryAction, updateGlossaryEntryAction, deleteGlossaryEntryAction } from "@/server/actions/glossary";
import { toast } from "sonner";

export function GlossaryEditor({ entries }: { entries: { id: string; question: string; answer: string }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState(false);

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

  return (
    <div className="space-y-4">
      <Button onClick={() => setNewForm(!newForm)}><Plus className="h-4 w-4 mr-1" />Добавить запись</Button>

      {newForm && (
        <Card className="rounded-2xl border-primary/20">
          <CardContent className="p-4">
            <form action={handleCreate} className="space-y-3">
              <Input name="question" placeholder="Вопрос" required />
              <Textarea name="answer" placeholder="Ответ" rows={4} required />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => setNewForm(false)}>Отмена</Button>
                <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Добавить"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !newForm ? (
        <Card className="rounded-2xl">
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">Глоссарий пуст. Добавьте первую запись.</p>
          </CardContent>
        </Card>
      ) : entries.map((entry) => (
        <Card key={entry.id} className="rounded-2xl">
          <CardContent className="p-4">
            {editingId === entry.id ? (
              <form action={handleUpdate} className="space-y-3">
                <input type="hidden" name="id" value={entry.id} />
                <Input name="question" defaultValue={entry.question} required />
                <Textarea name="answer" defaultValue={entry.answer} rows={4} required />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>Отмена</Button>
                  <Button type="submit" size="sm" disabled={pending}>{pending ? "..." : "Сохранить"}</Button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.question}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{entry.answer}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(entry.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
