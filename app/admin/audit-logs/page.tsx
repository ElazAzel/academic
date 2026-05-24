import { redirect } from "next/navigation";

export const metadata = {
  title: "Журнал аудита — Администрирование",
  description: "Журнал всех действий пользователей.",
};


export const dynamic = "force-dynamic";

export default function AuditLogsPage() {
  redirect("/admin/audit");
}
