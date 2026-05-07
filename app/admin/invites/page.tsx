import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { InvitesView } from "./invites-view";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requireRolePage(["admin"]);
  const prisma = getPrisma();
  
  const courses = await prisma.course.findMany({ select: { id: true, title: true } });
  const cohorts = await prisma.cohort.findMany({ select: { id: true, name: true } });
  
  const invitesDb = await prisma.inviteLink.findMany({
    include: { course: true, cohort: true },
    orderBy: { createdAt: "desc" }
  });

  const invites = invitesDb.map(inv => ({
    id: inv.id,
    token: inv.token,
    courseTitle: inv.course?.title ?? null,
    cohortName: inv.cohort?.name ?? null,
    activationCount: inv.activationCount,
    maxActivations: inv.maxActivations,
    expiresAt: inv.expiresAt ? inv.expiresAt.toLocaleDateString("ru-RU") : null,
    status: inv.status
  }));

  return (
    <AppShell role="admin">
      <PageHeader title="Инвайт-ссылки" description="Управление доступом через инвайт-ссылки и токены. Вместо платежей — по приглашению." badge="Администратор" />
      <div className="mt-6">
        <InvitesView invites={invites} courses={courses} cohorts={cohorts} />
      </div>
    </AppShell>
  );
}
