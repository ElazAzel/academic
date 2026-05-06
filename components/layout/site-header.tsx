import Link from "next/link";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/student", label: "Слушатель" },
  { href: "/curator", label: "Куратор" },
  { href: "/instructor", label: "Преподаватель" },
  { href: "/admin", label: "Админ" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span>AI Strategic Academy</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/login">
            <LogIn className="h-4 w-4" aria-hidden />
            Войти
          </Link>
        </Button>
      </div>
    </header>
  );
}

