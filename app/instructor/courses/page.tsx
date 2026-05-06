import { WorkspacePage } from "@/components/lms/workspace-page";

export default function InstructorCoursesPage() {
  return <WorkspacePage title="Курсы преподавателя" description="Список курсов с draft/published/archived состояниями." items={["Черновики", "Опубликованные", "Архив"]} />;
}

