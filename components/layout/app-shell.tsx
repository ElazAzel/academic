import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import { PageTransition } from "@/components/lms/animations";
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
    <div className="page-container">
      {/* Header on all sizes */}
      <SiteHeader />

      {/* Mobile bottom nav */}
      <MobileBottomNav role={role} />

      {/* Desktop sidebar layout */}
      <div className="mx-auto w-full max-w-7xl px-0 lg:px-6">
        <div className="academy-shell-layout">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="academy-shell-sidebar hidden lg:block">
            <nav
              className="academy-sidebar-panel sticky top-24 flex flex-col rounded-lg p-sm"
              aria-label={`Кабинет: ${roleLabel}`}
            >
              {/* Role label */}
              <div className="mx-sm mb-sm border-b border-m3-outline-variant/40 px-sm pb-sm">
                <span className="flex items-center gap-2 font-label-md text-label-md text-m3-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-[var(--academy-accent)]" aria-hidden="true" />
                  {roleLabel}
                </span>
              </div>

              {/* Navigation items */}
              <NavLinks links={links} />

              {/* Spacer */}
              <div className="mt-auto" />
            </nav>
          </aside>

          {/* Main content */}
          <main
            className={cn(
              "min-w-0 outline-none",
              "academy-shell-main px-4 pb-24 lg:px-0 lg:pb-8",
              className
            )}
          >
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}
