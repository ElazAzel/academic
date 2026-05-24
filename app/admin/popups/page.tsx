import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { AdminPopupManagerClient } from "./client";

export const metadata = {
  title: "Всплывающие окна — Администрирование",
  description: "Управление всплывающими окнами.",
};


export const dynamic = "force-dynamic";

export default async function AdminPopupsPage() {
  await requireRolePage(["admin"]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Управление попапами"
        description="Создание и управление всплывающими уведомлениями для пользователей."
      />
      <div className="mt-6">
        <AdminPopupManagerClient />
      </div>
    </AppShell>
  );
}
