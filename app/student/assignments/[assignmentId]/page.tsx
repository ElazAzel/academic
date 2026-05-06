import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return <WorkspacePage title="Домашнее задание" description={`Сдача текста, ссылки или файла по заданию ${assignmentId}.`} items={["Инструкция", "Загрузка файла", "Статус проверки"]} />;
}

