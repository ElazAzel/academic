import { SiteHeader } from "@/components/layout/site-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";
import { ROLE_LABELS } from "@/types/domain";

export function AppShell({
  children,
  className,
  role = "student",
}: {
  children: React.ReactNode;
  className?: string;
  role?: RoleKey;
}) {
  const links = NAV_BY_ROLE[role];
  const roleLabel = ROLE_LABELS[role];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3 lg:hidden mb-4">
          <MobileNav links={links} role={role} />
          <div>
            <h2 className="text-sm font-medium">{roleLabel}</h2>
            <p className="text-xs text-muted-foreground">Навигация по разделу</p>
          </div>
        </div>
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
          <aside className="hidden lg:block">
            <nav
              className="sticky top-24 space-y-1 rounded-2xl border bg-white/80 p-3 shadow-sm backdrop-blur-xl dark:bg-gray-950/80 dark:border-gray-800"
              aria-label={`Кабинет: ${roleLabel}`}
            >
              <NavLinks links={links} />
            </nav>
          </aside>
          <main className={cn("min-w-0", className)}>{children}</main>
        </div>
      </div>
    </div>
  );
}
