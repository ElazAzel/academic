import { WorkspacePage } from "@/components/lms/workspace-page";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <WorkspacePage title="Страница курса" description={`Силлабус, модули, дедлайны и прогресс курса ${courseId}.`} items={["Силлабус", "Модули", "Сертификат"]} />;
}

