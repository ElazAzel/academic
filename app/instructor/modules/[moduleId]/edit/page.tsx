import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getModule } from "@/server/modules/courses/service";
import { ModuleEditForm } from "@/components/instructor/module-edit-form";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorEditModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { moduleId } = await params;
  
  let courseModule;
  try {
    courseModule = await getModule(moduleId);
  } catch {
    notFound();
  }

  return (
    <AppShell role="instructor">
      <PageHeader 
        title="Редактор модуля" 
        description={`Редактирование модуля: ${courseModule.title}.`} 
        badge="Преподаватель" 
      />

      <div className="mt-8">
        <ModuleEditForm module={courseModule as unknown as Parameters<typeof ModuleEditForm>[0]["module"]} />
      </div>
    </AppShell>
  );
}
