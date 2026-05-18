import type { RoleKey } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface BottomNavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = {
  student: [
    { href: "/student", label: "Дашборд", icon: "dashboard" },
    { href: "/student/my-courses", label: "Мои курсы", icon: "menu_book" },
    { href: "/student/certificates", label: "Сертификаты", icon: "verified_user" },
    { href: "/student/notifications", label: "Уведомления", icon: "notifications" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "dashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "group" },
    { href: "/curator/chat", label: "Чат", icon: "chat" },
    { href: "/curator/notifications", label: "Уведомления", icon: "Bell" },
    { href: "/curator/glossary", label: "Глоссарий", icon: "FileText" },
    { href: "/curator/assignments", label: "Проверка", icon: "ClipboardCheck" },
    { href: "/curator/risks", label: "Риски", icon: "AlertTriangle" },
    { href: "/curator/reports", label: "Отчёты", icon: "BarChart3" },
    { href: "/curator/settings", label: "Настройки", icon: "Settings" },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/super-curator/cohorts", label: "Потоки", icon: "Users2" },
    { href: "/super-curator/curators", label: "Кураторы", icon: "UserCheck" },
    { href: "/super-curator/distribution", label: "Распределение", icon: "Users" },
    { href: "/super-curator/chat", label: "Чат кураторов", icon: "MessageCircle" },
    { href: "/super-curator/notifications", label: "Уведомления", icon: "notifications" },
    { href: "/super-curator/risks", label: "Риски потоков", icon: "warning" },
    { href: "/super-curator/reports", label: "Отчеты", icon: "bar_chart" },
    { href: "/super-curator/analytics", label: "Аналитика", icon: "bar_chart" },
    { href: "/super-curator/settings", label: "Настройки", icon: "settings" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "dashboard" },
    { href: "/instructor/courses", label: "Мои курсы", icon: "menu_book" },
    { href: "/instructor/students", label: "Слушатели", icon: "group" },
    { href: "/instructor/chat", label: "Сообщения", icon: "chat" },
    { href: "/instructor/notifications", label: "Уведомления", icon: "notifications" },
    { href: "/instructor/analytics", label: "Аналитика", icon: "bar_chart" },
    { href: "/instructor/reports", label: "Отчёты", icon: "bar_chart" },
    { href: "/instructor/settings", label: "Настройки", icon: "settings" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "dashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "menu_book" },
    { href: "/admin/management", label: "Управление", icon: "group" },
    { href: "/admin/analytics", label: "Аналитика", icon: "bar_chart" },
    { href: "/admin/reports", label: "Отчёты", icon: "bar_chart" },
    { href: "/admin/notifications", label: "Уведомления", icon: "notifications" },
    { href: "/admin/audit", label: "Аудит", icon: "description" },
    { href: "/admin/glossary", label: "Глоссарий", icon: "description" },
    { href: "/admin/popups", label: "Попапы", icon: "notifications" },
    { href: "/admin/roles", label: "Роли", icon: "verified_user" },
    { href: "/admin/settings", label: "Настройки", icon: "settings" },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд проекта", icon: "dashboard" },
    { href: "/customer-observer/reports", label: "Отчеты", icon: "bar_chart" },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: "verified_user" },
    { href: "/customer-observer/settings", label: "Настройки", icon: "settings" },
  ],
};

/**
 * Bottom navigation config for mobile app-like experience.
 * Shows the top 4-5 most important items per role.
 */
export const BOTTOM_NAV_BY_ROLE: Record<RoleKey, BottomNavItem[]> = {
  student: [
    { href: "/student", label: "Главная", icon: "dashboard" },
    { href: "/student/my-courses", label: "Курсы", icon: "menu_book" },
    { href: "/student/certificates", label: "Сертификаты", icon: "verified_user" },
    { href: "/student/notifications", label: "Уведомления", icon: "notifications" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "dashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "group" },
    { href: "/curator/chat", label: "Чат", icon: "chat" },
    { href: "/curator/assignments", label: "Проверка", icon: "clipboard_check" },
    { href: "/curator/notifications", label: "Уведомления", icon: "notifications" },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: "dashboard" },
    { href: "/super-curator/cohorts", label: "Потоки", icon: "groups" },
    { href: "/super-curator/curators", label: "Кураторы", icon: "person_check" },
    { href: "/super-curator/chat", label: "Чаты", icon: "chat" },
    { href: "/super-curator/notifications", label: "Уведомления", icon: "notifications" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "dashboard" },
    { href: "/instructor/courses", label: "Курсы", icon: "menu_book" },
    { href: "/instructor/students", label: "Слушатели", icon: "group" },
    { href: "/instructor/chat", label: "Сообщения", icon: "chat" },
    { href: "/instructor/notifications", label: "Уведомления", icon: "notifications" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "dashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "menu_book" },
    { href: "/admin/management", label: "Управление", icon: "group" },
    { href: "/admin/analytics", label: "Аналитика", icon: "bar_chart" },
    { href: "/admin/notifications", label: "Уведомления", icon: "notifications" },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд", icon: "dashboard" },
    { href: "/customer-observer/reports", label: "Отчеты", icon: "bar_chart" },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: "verified_user" },
    { href: "/customer-observer/settings", label: "Настройки", icon: "settings" },
  ],
};
