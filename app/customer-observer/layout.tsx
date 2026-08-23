import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Кабинет заказчика",
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="customer_observer">{children}</AppShell>;
}
