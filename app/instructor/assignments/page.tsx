import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { StatusBadge } from "@/components/lms/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import Link from "next/link";
import { createAssignmentAction } from "@/server/actions/quiz-assignment";

export const dynamic = "force-dynamic";

export default async function InstructorAssignmentsPage() {
 const user = await requireRolePage(["instructor", "admin"]);
 const prisma = getPrisma();

 const assignments = await prisma.assignment.findMany({
  where: {
   course: { instructors: { some: { userId: user.id } } }
  },
  include: {
   course: true,
   lesson: true,
   _count: { select: { submissions: { where: { status: "SUBMITTED" } } } }
  },
  orderBy: { createdAt: "desc" }
 });

 return (
  <AppShell role="instructor">
   <PageHeader title="Конструктор заданий" description="Инструкции, дедлайны, критерии и проверка попыток."/>
   <div className="space-y-6 mt-6">
     <form action={createAssignmentAction}>
      <Button type="submit">
       <Icon name="add" className="text-[18px]" />
       Создать задание
      </Button>
     </form>
    <div className="space-y-3">
     {assignments.length > 0 ? (
      assignments.map((a) => (
       <Card key={a.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-soft-hover">
        <CardContent className="flex items-center gap-4 py-4">
         <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20 shrink-0">
          <Icon name="description" className="text-[22px] text-m3-tertiary" />
         </span>
         <div className="flex-1 min-w-0">
          <p className="font-label-lg text-label-lg text-m3-on-surface">{a.title}</p>
          <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
           {a.course?.title} {a.lesson ? `· ${a.lesson.title}` : ""} · макс. {a.maxAttempts} попытки · макс. балл {a.maxScore}
          </p>
         </div>
          {a._count.submissions > 0 && (
           <StatusBadge status="IN_REVIEW" label={`${a._count.submissions} на проверку`} />
          )}
         <Button size="sm" variant="secondary" asChild>
          <Link href={`/instructor/assignments/${a.id}/edit`}>Редактировать</Link>
         </Button>
        </CardContent>
       </Card>
      ))
      ) : (
       <EmptyState icon="description" title="Заданий пока нет" description="Создайте первое задание для вашего курса." />
      )}
    </div>
   </div>
  </AppShell>
 );
}
