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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest/60 px-6 py-16 text-center shadow-m3-soft backdrop-blur-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-m3-surface-container-high/40 shadow-[0_0_24px_rgba(26,68,148,0.06)]">
        {typeof iconProp === "string" ? (
          <Icon name={iconProp} size={28} className="text-m3-on-surface-variant/50" />
        ) : LucideIconCmp ? (
          <LucideIconCmp className="h-7 w-7 text-m3-on-surface-variant/50" />
        ) : null}
      </div>
      <h3 className="text-headline-sm font-headline-sm text-m3-on-surface tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-body-md font-body-md text-m3-on-surface-variant leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
