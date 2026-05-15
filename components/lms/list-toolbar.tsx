"use client";

import { Search, Filter, Download } from "lucide-react";
import { useState } from "react";

export function ListToolbar({
  searchPlaceholder = "Поиск...",
  onSearch,
  onExport,
  filters,
}: {
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onExport?: () => void;
  filters?: { label: string; value: string; active?: boolean; onClick: () => void }[];
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-xl border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      {filters && filters.length > 0 && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm transition hover:bg-muted"
        >
          <Filter className="h-4 w-4" />
          Фильтры
        </button>
      )}
      {onExport && (
        <button
          onClick={onExport}
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      )}
      {showFilters && filters && (
        <div className="flex w-full flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={f.onClick}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs transition ${
                f.active
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
