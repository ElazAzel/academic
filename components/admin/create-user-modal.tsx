"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUserAction } from "@/server/actions/admin";
import { Loader2, X } from "lucide-react";
import { ROLE_LABELS, type RoleKey } from "@/types/domain";
import { CREATE_USER_ERROR, getSafeUserActionError, readUserActionResultError } from "./user-action-errors";

export function CreateUserModal({ 
  onClose,
  assignableRoles 
}: { 
  onClose: () => void;
  assignableRoles: RoleKey[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const formData = new FormData(event.currentTarget);
      const result = await createUserAction(formData);
      if (!result.success) {
        setError(readUserActionResultError(result, CREATE_USER_ERROR));
        return;
      }
      onClose();
    } catch (err) {
      setError(getSafeUserActionError(err, CREATE_USER_ERROR));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-m3-outline-variant bg-card shadow-m3-modal animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Добавить пользователя</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть окно создания пользователя"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-semibold uppercase text-muted-foreground">Имя</label>
            <Input id="name" name="name" placeholder="Иван Иванов" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase text-muted-foreground">Эл. почта</label>
            <Input id="email" name="email" type="email" required placeholder="ivan@example.com" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase text-muted-foreground">Роли</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignableRoles.map((role) => (
                <label key={role} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer text-sm">
                  <input type="checkbox" name="roles" value={role} defaultChecked={role === "student"} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </fieldset>
          
          {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>}
          
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={pending}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать аккаунт"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
