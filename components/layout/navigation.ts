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
import type { LucideIcon } from "lucide-react";
import type { RoleKey } from "@/types/domain";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
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
  Link2,
};

export const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = {
  student: [
    { href: "/student", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/student/my-courses", label: "Мои курсы", icon: "BookOpen" },
    { href: "/student/assignments", label: "Задания", icon: "ClipboardCheck" },
    { href: "/student/quizzes", label: "Тесты", icon: "FileText" },
    { href: "/student/notifications", label: "Уведомления", icon: "Bell" },
    { href: "/student/certificates", label: "Сертификаты", icon: "ShieldCheck" },
    { href: "/student/settings", label: "Настройки", icon: "Settings" },
  ],
  curator: [
    { href: "/curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/curator/students", label: "Слушатели", icon: "Users" },
    { href: "/curator/questions", label: "Вопросы", icon: "MessageCircle" },
    { href: "/curator/assignments", label: "Проверка", icon: "ClipboardCheck" },
    { href: "/curator/risks", label: "Риски", icon: "AlertTriangle" },
    { href: "/curator/reports", label: "Отчёты", icon: "BarChart3" },
    { href: "/curator/settings", label: "Настройки", icon: "Settings" },
  ],
  super_curator: [
    { href: "/super-curator", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/super-curator/curators", label: "Кураторы", icon: "UserCheck" },
    { href: "/super-curator/distribution", label: "Распределение", icon: "Users2" },
    { href: "/super-curator/users", label: "Пользователи", icon: "Users" },
    { href: "/super-curator/risks", label: "Риски потоков", icon: "AlertTriangle" },
    { href: "/super-curator/reports", label: "Отчеты", icon: "BarChart3" },
    { href: "/super-curator/settings", label: "Настройки", icon: "Settings" },
  ],
  instructor: [
    { href: "/instructor", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/instructor/courses", label: "Мои курсы", icon: "BookOpen" },
    { href: "/instructor/assignments", label: "Задания", icon: "ClipboardCheck" },
    { href: "/instructor/quizzes", label: "Тесты", icon: "FileText" },
    { href: "/instructor/questions", label: "Вопросы", icon: "HelpCircle" },
    { href: "/instructor/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/instructor/settings", label: "Настройки", icon: "Settings" },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: "LayoutDashboard" },
    { href: "/admin/courses", label: "Курсы", icon: "BookOpen" },
    { href: "/admin/users", label: "Пользователи", icon: "Users" },
    { href: "/admin/enrollments", label: "Зачисления", icon: "UserCheck" },
    { href: "/admin/invites", label: "Инвайты", icon: "Link2" },
    { href: "/admin/analytics", label: "Аналитика", icon: "BarChart3" },
    { href: "/admin/reports", label: "Отчёты", icon: "BarChart3" },
    { href: "/admin/audit", label: "Аудит", icon: "FileText" },
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
