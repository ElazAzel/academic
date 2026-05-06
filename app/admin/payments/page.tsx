import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminPaymentsPage() {
  return <WorkspacePage title="Платежи" description="Stripe Checkout, подписки, статусы и reconciliation доступа." items={["Оплаты", "Подписки", "Webhook"]} />;
}

