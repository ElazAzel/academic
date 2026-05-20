import { redirect } from "next/navigation";

export default async function RedirectToBuilder({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  redirect(`/instructor/courses/${courseId}/builder`);
}
