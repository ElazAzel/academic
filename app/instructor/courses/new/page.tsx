import { WorkspacePage } from "@/components/lms/workspace-page";

export default function CreateCoursePage() {
  return <WorkspacePage title="Создать курс" description="Редактор курса: описание, цель, обложка, режим прохождения и сертификат." items={["Основное", "Модули", "Публикация"]} />;
}

