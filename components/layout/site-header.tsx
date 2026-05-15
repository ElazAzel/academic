import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { ThemeToggle } from "@/components/lms/theme-toggle";
import { NotificationsDropdown } from "@/components/lms/notifications-dropdown";
import { NAV_BY_ROLE } from "@/components/layout/navigation";
import type { RoleKey } from "@/types/domain";

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
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl dark:bg-gray-950/80 dark:border-gray-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span>AI Strategic Academy</span>
        </Link>
        
        {user && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
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

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationsDropdown />
              <UserAccountNav user={user} />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" aria-hidden />
                Войти
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
