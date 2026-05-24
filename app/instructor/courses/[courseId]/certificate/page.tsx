import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { CertificateDesigner } from "@/components/admin/certificate-designer";

export const metadata = {
  title: "Сертификат курса — Инструктор",
  description: "Настройка сертификата курса.",
};


export const dynamic = "force-dynamic";

export default async function InstructorCertificateDesignerPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireRolePage(["instructor", "admin"]);
  const { courseId } = await params;

  return (
    <AppShell role="instructor">
      <PageHeader 
        title="Конструктор сертификатов" 
        description="Настройте координаты и стили ФИО слушателя, названия курса, часов и QR-кода на свидетельствах вашего курса." 
      />
      <div className="mt-6">
        <CertificateDesigner courseId={courseId} backUrl="/instructor/courses" />
      </div>
    </AppShell>
  );
}
