import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { SearchTrigger } from "@/components/layout/search-trigger";
import { ThemeToggle } from "@/components/lms/theme-toggle";
import { NotificationsDropdown } from "@/components/lms/notifications-dropdown";
import { AUTH_ROUTES } from "@/lib/constants";
import { getRuntimeBranding } from "@/server/modules/branding/service";
import { BrandMark } from "@/components/layout/brand-mark";

export async function SiteHeader() {
  const [user, branding] = await Promise.all([getCurrentUser(), getRuntimeBranding()]);

  return (
    <header className="site-header sticky top-0 z-30 border-b border-[var(--academy-line)] bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between px-3 md:px-6">
        {/* Logo — compact on mobile */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 font-semibold">
          <span className="sr-only">На главную: </span>
          <span className="sr-only sm:hidden">{branding.name}</span>
          <BrandMark branding={branding} size="sm" className="md:h-9 md:w-9" />
          <span className="hidden sm:flex sm:flex-col sm:leading-none">
            <span className="text-sm text-primary md:text-base font-semibold tracking-tight">
              {branding.name}
            </span>
            <span className="mt-1 hidden text-[11px] font-medium text-muted-foreground md:inline">
              {branding.subtitle}
            </span>
          </span>
        </Link>

        {/* Search trigger (desktop) */}
        {user ? <SearchTrigger /> : null}

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-1.5">
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
