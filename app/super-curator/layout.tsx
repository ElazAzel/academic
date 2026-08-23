import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Панель супер-куратора",
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="super_curator">{children}</AppShell>;
}
