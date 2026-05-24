import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getModule } from "@/server/modules/courses/service";

export const metadata = {
  title: "Редактирование модуля — Инструктор",
  description: "Редактирование параметров модуля.",
};


export default async function RedirectToBuilder({ params }: { params: Promise<{ moduleId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { moduleId } = await params;
  const mod = await getModule(moduleId);
  redirect(`/instructor/courses/${mod.course.id}/builder?moduleId=${moduleId}`);
}
