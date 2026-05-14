import { redirect } from "next/navigation";

export default async function AdminCourseBuilderPage(props: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await props.params;
  redirect(`/instructor/courses/${courseId}/builder`);
}
