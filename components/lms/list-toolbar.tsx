"use client";

import { Icon } from "@/components/ui/icon";
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
        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant" />
        <input
          className="h-10 w-full rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest pl-9 pr-3 text-body-md font-body-md text-m3-on-surface outline-none transition focus:border-m3-outline focus:ring-2 focus:ring-m3-outline-variant placeholder:text-m3-on-surface-variant/50"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      {filters && filters.length > 0 && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest px-3 text-body-md font-body-md text-m3-on-surface-variant transition hover:bg-m3-surface-container-high"
        >
          <Icon name="filter_list" size={16} />
          Фильтры
        </button>
      )}
      {onExport && (
        <button
          onClick={onExport}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest px-3 text-body-md font-body-md text-m3-on-surface-variant transition hover:bg-m3-surface-container-high"
        >
          <Icon name="download" size={16} />
          Экспорт
        </button>
      )}
      {showFilters && filters && (
        <div className="flex w-full flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={f.onClick}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-label-sm font-label-sm transition ${
                f.active
                  ? "border-m3-outline bg-m3-secondary-container text-m3-secondary"
                  : "border-m3-outline-variant text-m3-on-surface-variant hover:bg-m3-surface-container-high"
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
