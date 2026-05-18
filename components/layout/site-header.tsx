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
  const primaryRole = rolePriority.find((r) => roles.includes(r)) ?? "student";
  const links = NAV_BY_ROLE[primaryRole];
  const count = HEADER_LINKS_COUNT[primaryRole] ?? 3;
  return { links: links.slice(0, count), primaryRole };
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b border-m3-outline-variant bg-m3-surface-container-lowest/80 shadow-m3-soft backdrop-blur-xl">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
        {/* Logo — compact on mobile */}
        <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
          <span className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-m3-primary text-white">
            <Icon name="school" size={20} className="md:hidden" aria-hidden />
            <Icon name="school" size={24} className="hidden md:block" aria-hidden />
          </span>
          <span className="hidden sm:inline text-sm md:text-base text-m3-primary">AI Strategic Academy</span>
        </Link>

        {/* Desktop nav links — hidden on mobile (bottom nav handles it) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Основная навигация">
            {(() => {
              const { links } = getHeaderLinks(user.roles);
              return links.map((item) => (
                <Button key={item.href} asChild variant="ghost" size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ));
            })()}
          </nav>
        )}

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
              <Link href={AUTH_ROUTES.LOGIN}>
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
