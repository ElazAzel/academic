import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { ThemeToggle } from "@/components/lms/theme-toggle";
import { NotificationsDropdown } from "@/components/lms/notifications-dropdown";

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
        
        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {/* Menu links have been removed per user request */}
        </nav>

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
