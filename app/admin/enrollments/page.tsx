import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminEnrollmentsPage() {
  return <WorkspacePage title="Зачисления" description="Доступы, потоки, спецссылки и whitelist email." items={["Доступы", "Потоки", "Спецссылки"]} />;
}

