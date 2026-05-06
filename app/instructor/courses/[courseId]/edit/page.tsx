import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <WorkspacePage title="Редактировать курс" description={`Редактор курса ${courseId}.`} items={["Описание", "Инструкторы", "Настройки доступа"]} />;
}

