import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { CertificateDesigner } from "@/components/admin/certificate-designer";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ courseId: string }> };

export default async function AdminCertificateDesignerPage({ params }: { params: Promise<{ courseId: string }> }) {
  await requireRolePage(["admin"]);
  const { courseId } = await params;

  return (
    <AppShell role="admin">
      <PageHeader 
        title="Конструктор сертификатов" 
        description="Настройте координаты и стили ФИО слушателя, названия курса, часов и QR-кода на свидетельствах." 
      />
      <div className="mt-6">
        <CertificateDesigner courseId={courseId} backUrl="/admin/certificates" />
      </div>
    </AppShell>
  );
}
