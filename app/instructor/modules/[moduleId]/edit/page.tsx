import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function EditModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  return <WorkspacePage title="Редактор модуля" description={`Модуль ${moduleId}: уроки, сроки и условия завершения.`} items={["Уроки", "Дедлайны", "Условия"]} />;
}

