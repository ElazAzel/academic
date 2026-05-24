import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/icon";

/**
 * Компонент пустого состояния.
 * `icon` — либо строка (Material Symbols name), либо компонент LucideIcon.
 * При передаче LucideIcon используется `<Icon>` враппер с Material Symbols.
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
  const LucideIconCmp = typeof iconProp === "string" ? null : iconProp;
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-m3-outline-variant bg-m3-surface-container-lowest px-6 py-16 text-center shadow-m3-soft">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-m3-surface-container-high">
        {typeof iconProp === "string" ? (
          <Icon name={iconProp} size={28} className="text-m3-on-surface-variant/60" />
        ) : LucideIconCmp ? (
          <LucideIconCmp className="h-7 w-7 text-m3-on-surface-variant/60" />
        ) : null}
      </div>
      <h3 className="text-headline-sm font-headline-sm text-m3-on-surface">{title}</h3>
      <p className="mt-1 max-w-sm text-body-md font-body-md text-m3-on-surface-variant">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
