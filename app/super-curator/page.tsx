import { WorkspacePage } from "@/components/lms/workspace-page";

export default function SuperCuratorDashboardPage() {
  return <WorkspacePage title="Дашборд супер-куратора" description="Нагрузка кураторов, распределение слушателей, риски потоков и SLA." badge="Супер-куратор" items={["Нагрузка", "Распределение", "Риски"]} />;
}

