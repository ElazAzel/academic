import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminCoursesPage() {
  return <WorkspacePage title="Курсы" description="Все курсы академии, публикация, архив и версии." items={["Курсы", "Модули", "Версии"]} />;
}

