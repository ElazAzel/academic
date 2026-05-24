import { redirect } from "next/navigation";

export const metadata = {
  title: "Учебный план — Инструктор",
  description: "Учебный план и структура курса.",
};


export default async function RedirectToBuilder({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  redirect(`/instructor/courses/${courseId}/builder`);
}
