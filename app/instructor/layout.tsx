import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Кабинет преподавателя",
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="instructor">{children}</AppShell>;
}
