import Link from "next/link";
import { Bell, BookOpen, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

const links = [
  { href: "/student", label: "Дашборд", icon: LayoutDashboard },
  { href: "/student/my-courses", label: "Мои курсы", icon: BookOpen },
  { href: "/student/notifications", label: "Уведомления", icon: Bell },
  { href: "/student/certificates", label: "Сертификаты", icon: ShieldCheck },
  { href: "/student/settings", label: "Настройки", icon: Settings }
];

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border bg-white/80 p-2 shadow-sm backdrop-blur-xl" aria-label="Кабинет">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className={cn("min-w-0", className)}>{children}</main>
      </div>
    </div>
  );
}

