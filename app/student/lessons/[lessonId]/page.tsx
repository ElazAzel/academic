import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <WorkspacePage title="Страница урока" description={`Видео, материалы, тест/задание и вопрос куратору для урока ${lessonId}.`} items={["Материалы", "Задать вопрос", "Следующий урок"]} />;
}

