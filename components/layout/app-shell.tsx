import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types/domain";
import { ROLE_LABELS } from "@/types/domain";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: number;
}

const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = {
  student: [
    { href: "/student", label: "Дашборд", icon: LayoutDashboard },
    { href: "/student/my-courses", label: "Мои курсы", icon: BookOpen },
    { href: "/student/assignments", label: "Задания", icon: ClipboardCheck },
    { href: "/student/quizzes", label: "Тесты", icon: FileText },
    { href: "/student/notifications", label: "Уведомления", icon: Bell },
    { href: "/student/certificates", label: "Сертификаты", icon: ShieldCheck },
    { href: "/student/settings", label: "Настройки", icon: Settings },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: LayoutDashboard },
    { href: "/curator/students", label: "Слушатели", icon: Users },
    { href: "/curator/questions", label: "Вопросы", icon: MessageCircle },
    { href: "/curator/assignments", label: "Проверка", icon: ClipboardCheck },
    { href: "/curator/risks", label: "Риски", icon: AlertTriangle },
    { href: "/curator/settings", label: "Настройки", icon: Settings },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: LayoutDashboard },
    { href: "/super-curator/curators", label: "Кураторы", icon: UserCheck },
    { href: "/super-curator/distribution", label: "Распределение", icon: Users2 },
    { href: "/super-curator/users", label: "Пользователи", icon: Users },
    { href: "/super-curator/risks", label: "Риски потоков", icon: AlertTriangle },
    { href: "/super-curator/reports", label: "Отчеты", icon: BarChart3 },
    { href: "/super-curator/settings", label: "Настройки", icon: Settings },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: LayoutDashboard },
    { href: "/instructor/courses", label: "Мои курсы", icon: BookOpen },
    { href: "/instructor/assignments", label: "Задания", icon: ClipboardCheck },
    { href: "/instructor/quizzes", label: "Тесты", icon: FileText },
    { href: "/instructor/questions", label: "Вопросы", icon: HelpCircle },
    { href: "/instructor/analytics", label: "Аналитика", icon: BarChart3 },
    { href: "/instructor/settings", label: "Настройки", icon: Settings },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
    { href: "/admin/courses", label: "Курсы", icon: BookOpen },
    { href: "/admin/users", label: "Пользователи", icon: Users },
    { href: "/admin/enrollments", label: "Зачисления", icon: UserCheck },
    { href: "/admin/invites", label: "Инвайты", icon: Link2 },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
    { href: "/admin/audit", label: "Аудит", icon: FileText },
    { href: "/admin/roles", label: "Роли", icon: ShieldCheck },
    { href: "/admin/settings", label: "Настройки", icon: Settings },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд проекта", icon: LayoutDashboard },
    { href: "/customer-observer/reports", label: "Отчеты", icon: BarChart3 },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: ShieldCheck },
    { href: "/customer-observer/settings", label: "Настройки", icon: Settings },
  ],
};

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
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <nav
            className="sticky top-24 space-y-1 rounded-2xl border bg-white/80 p-3 shadow-sm backdrop-blur-xl"
            aria-label={`Кабинет: ${roleLabel}`}
          >
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </aside>
        <main className={cn("min-w-0", className)}>{children}</main>
      </div>
    </div>
  );
}
