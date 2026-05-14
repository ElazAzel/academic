"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { addCuratorAction } from "@/server/actions/super-curator";
import { toast } from "sonner";

export function AddCuratorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await addCuratorAction(formData);
      if (result.success) {
        toast.success("Куратор добавлен");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Добавить куратора
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить куратора</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input name="email" type="email" required placeholder="curator@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium">Имя</label>
            <Input name="name" placeholder="Имя Фамилия" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Добавление..." : "Добавить"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
