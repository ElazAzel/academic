import { redirect } from "next/navigation";

export const metadata = {
  title: "Редактирование курса — Инструктор",
  description: "Редактирование параметров курса.",
};


export default async function RedirectToBuilder({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  redirect(`/instructor/courses/${courseId}/builder`);
}
