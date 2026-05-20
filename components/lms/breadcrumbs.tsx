import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="flex items-center gap-2 text-label-md font-label-md text-m3-on-surface-variant mb-6" aria-label="Хлебные крошки">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && <Icon name="chevron_right" size={14} className="shrink-0 text-m3-outline" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-m3-on-surface">
              {item.label}
            </Link>
          ) : (
            <span className="text-m3-on-surface font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
