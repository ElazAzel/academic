import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { CertificatesDashboard } from "@/components/admin/certificates-dashboard";

export const metadata = {
  title: "Сертификаты — Администрирование",
  description: "Управление сертификатами.",
};


const prisma = getPrisma();
export const dynamic = "force-dynamic";

export default async function AdminCertificatesPage() {
  await requireRolePage(["admin"]);

  // Fetch all students, courses, and certificates
  const [students, courses, certificates] = await Promise.all([
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              key: "student"
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.course.findMany({
      where: {
        status: "PUBLISHED"
      },
      select: {
        id: true,
        title: true
      },
      orderBy: {
        title: "asc"
      }
    }),
    prisma.certificate.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            organization: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        issuedAt: "desc"
      }
    })
  ]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Сертификаты академии"
        description="Выпуск, учет и верификация образовательных сертификатов."
      />
      
      <CertificatesDashboard
        initialStudents={students}
        initialCourses={courses}
        initialCertificates={certificates.map(c => ({
          id: c.id,
          number: c.number,
          verificationCode: c.verificationCode,
          verificationUrl: c.verificationUrl,
          issuedAt: c.issuedAt.toISOString(),
          revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
          studentName: c.user.organization ?? c.user.name ?? c.user.email,
          studentEmail: c.user.email,
          courseTitle: c.course.title,
          forced: !!(c.metadata as Record<string, unknown>)?.forced
        }))}
      />
    </AppShell>
  );
}
