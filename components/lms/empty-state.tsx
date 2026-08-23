import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";

/**
 * Пустое состояние: спокойная заглушка с понятным следующим действием.
 * `icon` — строка (имя из ICON_MAP) или компонент LucideIcon.
 */
export function EmptyState({
  icon: iconProp,
  title,
  description,
  action,
}: {
  icon: LucideIcon | string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const LucideCmp = typeof iconProp === "string" ? null : iconProp;
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {typeof iconProp === "string" ? (
          <Icon name={iconProp} size={24} />
        ) : LucideCmp ? (
          <LucideCmp className="h-6 w-6" aria-hidden="true" />
        ) : null}
      </div>
      <h3 className="text-title-lg font-title-lg tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-body-sm font-body-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
