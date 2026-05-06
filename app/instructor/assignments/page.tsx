import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AssignmentBuilderPage() {
  return <WorkspacePage title="Конструктор заданий" description="Инструкции, дедлайны, критерии и проверка попыток." items={["Инструкция", "Критерии", "Проверка"]} />;
}

