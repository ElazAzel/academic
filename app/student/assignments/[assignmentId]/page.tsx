import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Button } from "@/components/ui/button";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAssignmentForStudent } from "@/server/modules/learning/service";
import { AssignmentView } from "./assignment-view";
import { ApiError } from "@/lib/http";
import { FORBIDDEN_ROUTE } from "@/lib/constants";

export const metadata = {
  title: "Задание — Студент",
  description: "Просмотр и выполнение задания.",
};


export const dynamic = "force-dynamic";

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
 const user = await requireRolePage(["student"]);
 const { assignmentId } = await params;

 let assignment;
 try {
  assignment = await getAssignmentForStudent(user.id, assignmentId);
  } catch (error) {
   if (error instanceof ApiError && error.code === "not_found") {
    notFound();
   }
    if (error instanceof ApiError && error.code === "forbidden") {
     redirect(FORBIDDEN_ROUTE);
    }
   throw error;
  }

 const courseHref = assignment.courseId ? `/student/courses/${assignment.courseId}` : "/student/my-courses";
 const lessonHref = assignment.lessonId ? `/student/lessons/${assignment.lessonId}` : courseHref;

 return (
  <AppShell role="student">
   <div className="mb-4">
    <Button asChild size="sm" variant="secondary">
     <Link href={lessonHref}>
      <ArrowLeft className="h-4 w-4"/>
      {assignment.lessonId ? "Назад к уроку" : "Назад к курсу"}
     </Link>
    </Button>
   </div>
   <PageHeader 
    title={assignment.title} 
    description={assignment.courseTitle} 
  />
   <AssignmentView assignment={assignment}/>
  </AppShell>
 );
}
