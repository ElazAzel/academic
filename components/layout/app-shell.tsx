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
      {/* Header — shown on all screen sizes */}
      <SiteHeader />

      {/* Mobile bottom navigation */}
      <MobileBottomNav role={role} />

      {/* Desktop sidebar layout */}
      <div className="mx-auto w-full max-w-7xl px-0 md:px-6">
        <div className="md:grid md:grid-cols-[260px_1fr] md:gap-6 md:py-6">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="hidden md:block">
            <nav
              className="sticky top-24 space-y-1 rounded-2xl border bg-card/80 p-3 shadow-sm backdrop-blur-xl"
              aria-label={`Кабинет: ${roleLabel}`}
            >
              <div className="mb-2 px-3 pb-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {roleLabel}
                </span>
              </div>
              <NavLinks links={links} />
            </nav>
          </aside>

          {/* Main content */}
          <main
            id="main-content"
            className={cn(
              "min-w-0 outline-none",
              // Mobile: full width, no padding (handled by page content)
              // Desktop: proper padding
              "px-4 md:px-0 pb-4 md:pb-8",
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
