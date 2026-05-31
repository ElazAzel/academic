import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getAdminCertificatesPageData } from "@/server/modules/page-data/service";
import { CertificatesDashboard } from "@/components/admin/certificates-dashboard";

export const metadata = {
  title: "Сертификаты — Администрирование",
  description: "Управление сертификатами.",
};


export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  await requireRolePage(["admin"]);

  const { students, courses, certificates } = await getAdminCertificatesPageData();

  return (
    <AppShell role="admin">
      <PageHeader
        title="Сертификаты академии"
        description="Выпуск, учет и верификация образовательных сертификатов."
      />
      
      <CertificatesDashboard
        initialStudents={students}
        initialCourses={courses}
        initialCertificates={certificates}
      />
    </AppShell>
  );
}
