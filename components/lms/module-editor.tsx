"use client";

import type { BuilderModuleDetail } from "@/types/domain";

export function ModuleEditor({
  module: mod,
  onChange,
}: {
  module: BuilderModuleDetail;
  onChange: (updates: Partial<BuilderModuleDetail>) => void;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Название модуля</label>
        <input
          className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={mod.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Описание</label>
        <textarea
          className="w-full min-h-[100px] rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={mod.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Порядок</label>
          <input
            type="number"
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={mod.order}
            onChange={(e) => onChange({ order: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Рекомендуемых дней</label>
          <input
            type="number"
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={mod.recommendedDays}
            onChange={(e) => onChange({ recommendedDays: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="rounded-xl bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          Уроков: {mod.lessons.length} · Статус: {mod.status === "DRAFT" ? "Черновик" : "Опубликован"}
        </p>
      </div>
    </div>
  );
}
