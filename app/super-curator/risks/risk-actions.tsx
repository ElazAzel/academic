"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { resolveRiskAction } from "@/server/actions/risk-management";
import { createRiskAction, getStudentsForRisk } from "@/server/actions/risk-management";
import { toast } from "sonner";

export function RiskActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string | null; email: string }[]>([]);

  async function openDialog() {
    setOpen(true);
    if (students.length === 0) {
      const list = await getStudentsForRisk();
      setStudents(list);
    }
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createRiskAction(formData);
      if (result.success) {
        toast.success("Риск создан");
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2 mb-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={openDialog}><Plus className="h-4 w-4 mr-1" />Создать риск</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать риск</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="text-sm font-medium">Студент</label>
              <select id="userId" name="userId" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                <option value="">Выберите студента</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name ?? s.email}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="type" className="text-sm font-medium">Тип риска</label>
                <select id="type" name="type" required className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="inactive_login">Не заходил</option>
                  <option value="inactive_learning">Нет активности</option>
                  <option value="overdue_module">Просрочен модуль</option>
                  <option value="behind_schedule">Отстаёт</option>
                </select>
              </div>
              <div>
                <label htmlFor="severity" className="text-sm font-medium">Уровень</label>
                <select id="severity" name="severity" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="low">Низкий</option>
                  <option value="medium" selected>Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критичный</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? "Создание..." : "Создать"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ResolveRiskButton({ riskId }: { riskId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleResolve() {
    if (!confirm("Закрыть этот риск?")) return;
    setPending(true);
    try {
      await resolveRiskAction(riskId);
      toast.success("Риск закрыт");
      router.refresh();
    } catch {
      toast.error("Ошибка");
    } finally { setPending(false); }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleResolve} disabled={pending} className="text-muted-foreground hover:text-emerald-600">
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
