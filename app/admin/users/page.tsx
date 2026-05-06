import { WorkspacePage } from "@/components/lms/workspace-page";

export default function AdminUsersPage() {
  return <WorkspacePage title="Пользователи" description="Слушатели, преподаватели, кураторы, супер-кураторы и заказчики." items={["Список", "Импорт", "Блокировка"]} />;
}

