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
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 lg:py-6">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="hidden lg:block">
            <nav
              className="sticky top-24 flex flex-col rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest p-sm shadow-m3-soft"
              aria-label={`Кабинет: ${roleLabel}`}
            >
              {/* Role label */}
              <div className="mx-sm mb-xs border-b border-m3-outline-variant px-sm pb-xs">
                <span className="font-label-md text-label-md uppercase tracking-wider text-m3-on-surface-variant">
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
            id="main-content"
            className={cn(
              "min-w-0 outline-none animate-slide-up",
              "px-4 pb-24 lg:px-0 lg:pb-8",
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
