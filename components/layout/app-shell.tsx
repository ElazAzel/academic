import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { RoleSidebar } from "@/components/layout/sidebar-nav";
import { PageTransition } from "@/components/lms/animations";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";

export function AppShell({
  children,
  className,
  role = "student",
}: {
  children: React.ReactNode;
  className?: string;
  role?: RoleKey;
}) {
  return (
    <div className="page-container">
      {/* Header on all sizes */}
      <SiteHeader />

      {/* Mobile bottom nav */}
      <MobileBottomNav role={role} />

      {/* Desktop: sidebar rail + content, mobile/tablet: single column */}
      <div className="mx-auto w-full max-w-7xl px-0 lg:px-6">
        <div className="academy-shell-layout">
          <aside className="academy-shell-sidebar hidden lg:block" aria-label="Боковая навигация">
            <RoleSidebar role={role} />
          </aside>

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
