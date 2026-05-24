import { redirect } from "next/navigation";

export const metadata = {
  title: "Платежи — Администрирование",
  description: "Управление платежами и транзакциями.",
};


export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
  redirect("/admin/invites");
}
