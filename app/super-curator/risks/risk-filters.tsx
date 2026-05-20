"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";

export function RiskFilters({
  cohorts,
  curators,
}: {
  cohorts: { id: string; name: string }[];
  curators: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/super-curator/risks?${params.toString()}`);
  }

  function resetFilters() {
    router.push("/super-curator/risks");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilter("search", search)}
        />
      </div>

      <select
        className="rounded-xl border bg-background px-3 py-2 text-sm"
        onChange={(e) => applyFilter("cohortId", e.target.value)}
        defaultValue=""
      >
        <option value="">Все потоки</option>
        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select
        className="rounded-xl border bg-background px-3 py-2 text-sm"
        onChange={(e) => applyFilter("curatorId", e.target.value)}
        defaultValue=""
      >
        <option value="">Все кураторы</option>
        {curators.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.email}</option>)}
      </select>

      <select
        className="rounded-xl border bg-background px-3 py-2 text-sm"
        onChange={(e) => applyFilter("type", e.target.value)}
        defaultValue=""
      >
        <option value="">Все типы</option>
        <option value="inactive_login">Не заходил</option>
        <option value="inactive_learning">Нет активности</option>
        <option value="overdue_module">Просрочен модуль</option>
        <option value="behind_schedule">Отстаёт</option>
      </select>

      <select
        className="rounded-xl border bg-background px-3 py-2 text-sm"
        onChange={(e) => applyFilter("severity", e.target.value)}
        defaultValue=""
      >
        <option value="">Все уровни</option>
        <option value="critical">Критичный</option>
        <option value="high">Высокий</option>
        <option value="medium">Средний</option>
        <option value="low">Низкий</option>
      </select>

      <Button variant="ghost" size="sm" onClick={resetFilters}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
