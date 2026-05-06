import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <WorkspacePage title="Редактор урока" description={`Урок ${lessonId}: блоки, медиа, тесты и задания.`} items={["Блоки", "Медиа", "Вопросы"]} />;
}

