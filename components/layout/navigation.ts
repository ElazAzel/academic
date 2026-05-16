import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

export const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
  Users,
  MessageCircle,
  AlertTriangle,
  UserCheck,
  Users2,
  BarChart3,
  HelpCircle,
};

export const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = {
  student: [
    { href: "/student", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/student/my-courses", label: "Мои курсы", icon: "BookOpen" },
    { href: "/student/certificates", label: "Сертификаты", icon: "ShieldCheck" },
    { href: "/student/notifications", label: "Уведомления", icon: "Bell" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "Users" },
    { href: "/curator/chat", label: "Чат", icon: "MessageCircle" },
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
    { href: "/super-curator/notifications", label: "Уведомления", icon: "Bell" },
    { href: "/super-curator/risks", label: "Риски потоков", icon: "AlertTriangle" },
    { href: "/super-curator/reports", label: "Отчеты", icon: "BarChart3" },
    { href: "/super-curator/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/super-curator/settings", label: "Настройки", icon: "Settings" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/instructor/courses", label: "Мои курсы", icon: "BookOpen" },
    { href: "/instructor/students", label: "Слушатели", icon: "Users" },
    { href: "/instructor/chat", label: "Сообщения", icon: "MessageCircle" },
    { href: "/instructor/notifications", label: "Уведомления", icon: "Bell" },
    { href: "/instructor/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/instructor/reports", label: "Отчёты", icon: "BarChart3" },
    { href: "/instructor/settings", label: "Настройки", icon: "Settings" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "BookOpen" },
    { href: "/admin/management", label: "Управление", icon: "Users" },
    { href: "/admin/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/admin/reports", label: "Отчёты", icon: "BarChart3" },
    { href: "/admin/notifications", label: "Уведомления", icon: "Bell" },
    { href: "/admin/audit", label: "Аудит", icon: "FileText" },
    { href: "/admin/glossary", label: "Глоссарий", icon: "FileText" },
    { href: "/admin/popups", label: "Попапы", icon: "Bell" },
    { href: "/admin/roles", label: "Роли", icon: "ShieldCheck" },
    { href: "/admin/settings", label: "Настройки", icon: "Settings" },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд проекта", icon: "LayoutDashboard" },
    { href: "/customer-observer/reports", label: "Отчеты", icon: "BarChart3" },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: "ShieldCheck" },
    { href: "/customer-observer/settings", label: "Настройки", icon: "Settings" },
  ],
};

/**
 * Bottom navigation config for mobile app-like experience.
 * Shows the top 4-5 most important items per role.
 */
export const BOTTOM_NAV_BY_ROLE: Record<RoleKey, BottomNavItem[]> = {
  student: [
    { href: "/student", label: "Главная", icon: "LayoutDashboard" },
    { href: "/student/my-courses", label: "Курсы", icon: "BookOpen" },
    { href: "/student/certificates", label: "Сертификаты", icon: "ShieldCheck" },
    { href: "/student/notifications", label: "Уведомления", icon: "Bell" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "Users" },
    { href: "/curator/chat", label: "Чат", icon: "MessageCircle" },
    { href: "/curator/assignments", label: "Проверка", icon: "ClipboardCheck" },
    { href: "/curator/notifications", label: "Уведомления", icon: "Bell" },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/super-curator/cohorts", label: "Потоки", icon: "Users2" },
    { href: "/super-curator/curators", label: "Кураторы", icon: "UserCheck" },
    { href: "/super-curator/chat", label: "Чаты", icon: "MessageCircle" },
    { href: "/super-curator/notifications", label: "Уведомления", icon: "Bell" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/instructor/courses", label: "Курсы", icon: "BookOpen" },
    { href: "/instructor/students", label: "Слушатели", icon: "Users" },
    { href: "/instructor/chat", label: "Сообщения", icon: "MessageCircle" },
    { href: "/instructor/notifications", label: "Уведомления", icon: "Bell" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "BookOpen" },
    { href: "/admin/management", label: "Управление", icon: "Users" },
    { href: "/admin/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/admin/notifications", label: "Уведомления", icon: "Bell" },
  ],
  customer_observer: [
    { href: "/customer-observer", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/customer-observer/reports", label: "Отчеты", icon: "BarChart3" },
    { href: "/customer-observer/certificates", label: "Сертификаты", icon: "ShieldCheck" },
    { href: "/customer-observer/settings", label: "Настройки", icon: "Settings" },
  ],
};
