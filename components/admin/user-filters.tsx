"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, Download } from "lucide-react";
import { ROLE_LABELS } from "@/types/domain";

export function UserFilters({
  search,
  role,
  status,
}: {
  search: string;
  role: string;
  status: string;
}) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const params = new URLSearchParams();
    const s = (form.elements.namedItem("search") as HTMLInputElement).value;
    const r = (form.elements.namedItem("role") as HTMLSelectElement).value;
    const st = (form.elements.namedItem("status") as HTMLSelectElement).value;
    if (s) params.set("search", s);
    if (r) params.set("role", r);
    if (st) params.set("status", st);
    router.push(`/admin/users?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" name="search" defaultValue={search} placeholder="Поиск по имени или email..." />
      </div>
      <select name="role" defaultValue={role} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">Все роли</option>
        {Object.entries(ROLE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select name="status" defaultValue={status} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="">Все статусы</option>
        <option value="ACTIVE">Активен</option>
        <option value="INACTIVE">Неактивен</option>
        <option value="BLOCKED">Заблокирован</option>
        <option value="DELETED">Удалён</option>
      </select>
      <Button type="submit" size="sm">Найти</Button>
      <Button variant="ghost" size="sm" type="button" onClick={() => router.push("/admin/users")}>
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="sm" type="button" className="ml-auto" asChild>
        <a href={`/api/v1/users/export${search ? `?search=${search}` : ""}`}>
          <Download className="h-4 w-4 mr-1" />Экспорт CSV
        </a>
      </Button>
    </form>
  );
}
