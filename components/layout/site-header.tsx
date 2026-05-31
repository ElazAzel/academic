import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { ThemeToggle } from "@/components/lms/theme-toggle";
import { NotificationsDropdown } from "@/components/lms/notifications-dropdown";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import type { RoleKey } from "@/types/domain";
import { AUTH_ROUTES } from "@/lib/constants";

const HEADER_LINKS_COUNT: Record<string, number> = {
  student: 3,
  curator: 3,
  super_curator: 3,
  instructor: 3,
  admin: 3,
  customer_observer: 3,
};

function getHeaderLinks(roles: string[]) {
  const rolePriority: RoleKey[] = ["admin", "super_curator", "curator", "instructor", "customer_observer", "student"];
  const primaryRole = rolePriority.find((r) => roles.includes(r));
  if (!primaryRole) return { links: [], primaryRole: null };
  const links = NAV_BY_ROLE[primaryRole];
  const count = HEADER_LINKS_COUNT[primaryRole] ?? 3;
  return { links: links.slice(0, count), primaryRole };
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-m3-outline-variant/70 bg-m3-surface-container-lowest/88 shadow-[0_8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl site-header">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
        {/* Logo — compact on mobile */}
        <Link
          href="/"
          aria-label="На главную AI Strategic Academy"
          className="group flex shrink-0 items-center gap-2.5 font-semibold"
        >
          <span className="academy-brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-white md:h-9 md:w-9">
            <Icon name="school" size={20} className="md:hidden" aria-hidden />
            <Icon name="school" size={24} className="hidden md:block" aria-hidden />
          </span>
          <span className="hidden sm:flex sm:flex-col sm:leading-none">
            <span className="text-sm text-m3-primary md:text-base">AI Strategic Academy</span>
            <span className="mt-1 hidden text-[11px] font-medium text-m3-on-surface-variant md:inline">
              закрытая академия
            </span>
          </span>
        </Link>

        {/* Desktop nav links — hidden on mobile (bottom nav handles it) */}
        {(() => {
          if (!user) return null;
          const { links } = getHeaderLinks(user.roles);
          if (links.length === 0) return null;
          return (
            <nav className="hidden items-center gap-1 rounded-lg border border-m3-outline-variant/60 bg-m3-surface-container-low/70 p-1 lg:flex" aria-label="Основная навигация">
              {links.map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm" className="h-8 min-h-8 px-3">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>
          );
        })()}

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationsDropdown />
              <UserAccountNav user={user} />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href={AUTH_ROUTES.LOGIN} aria-label="Войти">
                <Icon name="login" size={16} className="mr-1.5" aria-hidden />
                <span className="hidden sm:inline">Войти</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
