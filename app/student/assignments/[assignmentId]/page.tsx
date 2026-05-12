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
    redirect("/403");
   }
   throw error;
  }

 return (
  <AppShell role="student">
   <div className="mb-4">
    <Button asChild size="sm" variant="secondary">
     <Link href={`/student/lessons/${assignment.lessonId}`}>
      <ArrowLeft className="h-4 w-4"/>
      Назад к уроку
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
