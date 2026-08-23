import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Панель администратора",
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="admin">{children}</AppShell>;
}
