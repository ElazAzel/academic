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
        <label htmlFor="moduleTitle" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Название модуля</label>
        <input
          id="moduleTitle"
          className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={mod.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="moduleDescription" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Описание</label>
        <textarea
          id="moduleDescription"
          className="w-full min-h-[100px] rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={mod.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="moduleOrder" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Порядок</label>
          <input
            id="moduleOrder"
            type="number"
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={mod.order}
            onChange={(e) => onChange({ order: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="recommendedDays" className="text-xs font-semibold uppercase uppercase-tracking text-muted-foreground">Рекомендуемых дней</label>
          <input
            id="recommendedDays"
            type="number"
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={mod.recommendedDays}
            onChange={(e) => onChange({ recommendedDays: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="rounded-lg bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          Уроков: {mod.lessons?.length ?? 0} · Статус: {mod.status === "DRAFT" ? "Черновик" : "Опубликован"}
        </p>
      </div>
    </div>
  );
}
