import type { RoleKey } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface BottomNavItem {
  href: string;
  label: string;
  icon: string;
}

export function getActiveNavHref(pathname: string, links: Array<Pick<NavItem, "href">>): string | null {
  const matches = links.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
}

/**
 * Сайдбар сгруппирован по смыслу: обучение/контент → работа с людьми →
 * аналитика → система. Порядок отражает частоту использования.
 */
export const NAV_GROUPS_BY_ROLE: Record<RoleKey, NavGroup[]> = {
  student: [
    {
      items: [
        { href: "/student", label: "Дашборд", icon: "dashboard" },
        { href: "/student/my-courses", label: "Мои курсы", icon: "menu_book" },
      ],
    },
    {
      label: "Результаты",
      items: [
        { href: "/student/certificates", label: "Сертификаты", icon: "workspace_premium" },
        { href: "/student/notifications", label: "Уведомления", icon: "notifications" },
      ],
    },
  ],
  curator: [
    {
      items: [
        { href: "/curator", label: "Дашборд", icon: "dashboard" },
        { href: "/curator/students", label: "Слушатели", icon: "group" },
        { href: "/curator/chat", label: "Чат", icon: "chat" },
        { href: "/curator/assignments", label: "Проверка работ", icon: "assignment" },
      ],
    },
    {
      label: "Контроль",
      items: [
        { href: "/curator/risks", label: "Риски", icon: "warning" },
        { href: "/curator/popups", label: "Уведомить", icon: "notifications_active" },
        { href: "/curator/notifications", label: "Уведомления", icon: "notifications" },
      ],
    },
    {
      label: "Справка",
      items: [
        { href: "/curator/reports", label: "Отчёты", icon: "bar_chart" },
        { href: "/curator/glossary", label: "Глоссарий", icon: "description" },
        { href: "/curator/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ],
  super_curator: [
    {
      items: [
        { href: "/super-curator", label: "Дашборд", icon: "dashboard" },
        { href: "/super-curator/cohorts", label: "Потоки", icon: "groups" },
        { href: "/super-curator/curators", label: "Кураторы", icon: "person_check" },
        { href: "/super-curator/distribution", label: "Распределение", icon: "swap_horiz" },
      ],
    },
    {
      label: "Контроль",
      items: [
        { href: "/super-curator/risks", label: "Риски потоков", icon: "warning" },
        { href: "/super-curator/chat", label: "Чат кураторов", icon: "chat" },
        { href: "/super-curator/notifications", label: "Уведомления", icon: "notifications" },
      ],
    },
    {
      label: "Аналитика",
      items: [
        { href: "/super-curator/analytics", label: "Аналитика", icon: "monitoring" },
        { href: "/super-curator/reports", label: "Отчёты", icon: "bar_chart" },
        { href: "/super-curator/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ],
  instructor: [
    {
      items: [
        { href: "/instructor", label: "Дашборд", icon: "dashboard" },
        { href: "/instructor/courses", label: "Мои курсы", icon: "menu_book" },
        { href: "/instructor/deadlines", label: "Дедлайны", icon: "schedule" },
      ],
    },
    {
      label: "Слушатели",
      items: [
        { href: "/instructor/students", label: "Слушатели", icon: "group" },
        { href: "/instructor/attendance", label: "Посещаемость", icon: "fact_check" },
        { href: "/instructor/chat", label: "Сообщения", icon: "chat" },
      ],
    },
    {
      label: "Аналитика",
      items: [
        { href: "/instructor/analytics", label: "Аналитика", icon: "monitoring" },
        { href: "/instructor/reports", label: "Отчёты", icon: "bar_chart" },
        { href: "/instructor/notifications", label: "Уведомления", icon: "notifications" },
        { href: "/instructor/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ],
  admin: [
    {
      items: [
        { href: "/admin", label: "Дашборд", icon: "dashboard" },
        { href: "/admin/courses", label: "Курсы", icon: "menu_book" },
      ],
    },
    {
      label: "Портал",
      items: [
        { href: "/admin/management", label: "Пользователи", icon: "group" },
        { href: "/admin/roles", label: "Роли и доступы", icon: "verified_user" },
        { href: "/admin/enrollments", label: "Записи на курсы", icon: "assignment" },
        { href: "/admin/payments", label: "Платежи", icon: "bar_chart" },
      ],
    },
    {
      label: "Аналитика",
      items: [
        { href: "/admin/analytics", label: "Аналитика", icon: "monitoring" },
        { href: "/admin/reports", label: "Отчёты", icon: "description" },
        { href: "/admin/readiness", label: "Готовность", icon: "task_alt" },
      ],
    },
    {
      label: "Система",
      items: [
        { href: "/admin/certificates", label: "Сертификаты", icon: "workspace_premium" },
        { href: "/admin/audit", label: "Аудит", icon: "history" },
        { href: "/admin/glossary", label: "Глоссарий", icon: "description" },
        { href: "/admin/popups", label: "Попапы", icon: "notifications_active" },
        { href: "/admin/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ],
  customer_observer: [
    {
      items: [{ href: "/customer-observer", label: "Дашборд проекта", icon: "dashboard" }],
    },
    {
      label: "Отчётность",
      items: [
        { href: "/customer-observer/reports", label: "Отчёты", icon: "bar_chart" },
        { href: "/customer-observer/certificates", label: "Сертификаты", icon: "workspace_premium" },
        { href: "/customer-observer/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ],
};

/** Плоский список — совместимость с CommandPalette и старыми вызовами. */
export function flattenNavGroups(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}

const FLAT_BY_ROLE = Object.fromEntries(
  Object.entries(NAV_GROUPS_BY_ROLE).map(([role, groups]) => [role, flattenNavGroups(groups)])
) as Record<RoleKey, NavItem[]>;

export const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = FLAT_BY_ROLE;

export const BOTTOM_NAV_BY_ROLE: Record<RoleKey, BottomNavItem[]> = {
  student: [
    { href: "/student", label: "Главная", icon: "dashboard" },
    { href: "/student/my-courses", label: "Курсы", icon: "menu_book" },
    { href: "/student/certificates", label: "Сертификаты", icon: "workspace_premium" },
    { href: "/student/notifications", label: "Уведомления", icon: "notifications" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "dashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "group" },
    { href: "/curator/chat", label: "Чат", icon: "chat" },
    { href: "/curator/assignments", label: "Проверка", icon: "assignment" },
    { href: "/curator/notifications", label: "Ещё", icon: "menu" },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: "dashboard" },
    { href: "/super-curator/cohorts", label: "Потоки", icon: "groups" },
    { href: "/super-curator/curators", label: "Кураторы", icon: "person_check" },
    { href: "/super-curator/chat", label: "Чаты", icon: "chat" },
    { href: "/super-curator/notifications", label: "Ещё", icon: "menu" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "dashboard" },
    { href: "/instructor/courses", label: "Курсы", icon: "menu_book" },
    { href: "/instructor/students", label: "Слушатели", icon: "group" },
    { href: "/instructor/chat", label: "Сообщения", icon: "chat" },
    { href: "/instructor/notifications", label: "Ещё", icon: "menu" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "dashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "menu_book" },
    { href: "/admin/management", label: "Люди", icon: "group" },
    { href: "/admin/analytics", label: "Аналитика", icon: "monitoring" },
    { href: "/admin/notifications", label: "Ещё", icon: "menu" },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд", icon: "dashboard" },
    { href: "/customer-observer/reports", label: "Отчёты", icon: "bar_chart" },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: "workspace_premium" },
    { href: "/customer-observer/settings", label: "Настройки", icon: "settings" },
  ],
};
