import { redirect } from "next/navigation";
import { getModuleForStudent } from "@/server/modules/learning/service";
import { requireRolePage } from "@/lib/auth/page-guards";
import { ApiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function StudentModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { moduleId } = await params;

  try {
    const learningModule = await getModuleForStudent(user.id, moduleId);
    redirect(`/student/courses/${learningModule.courseId}`);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "not_found" || error.code === "forbidden")) {
      redirect("/student/my-courses");
    }
    throw error;
  }
}
