import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function StudentModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  return <WorkspacePage title="Страница модуля" description={`Уроки, сроки потока и условия завершения модуля ${moduleId}.`} items={["Уроки", "Дедлайн", "Условия"]} />;
}

