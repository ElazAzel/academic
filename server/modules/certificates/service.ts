import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export function generateCertificateNumber() {
  const year = new Date().getFullYear();
  return `ASA-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function issueCertificate(input: { userId: string; courseId: string }, actorId: string) {
  const progress = await prisma.courseProgress.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } }
  });
  if (!progress || progress.percent < env.CERTIFICATE_COMPLETION_THRESHOLD) {
    throw new ApiError("forbidden", "Условия выдачи сертификата не выполнены", 403, {
      requiredPercent: env.CERTIFICATE_COMPLETION_THRESHOLD,
      actualPercent: progress?.percent ?? 0
    });
  }
  const course = await prisma.course.findUniqueOrThrow({ where: { id: input.courseId } });
  if (course.finalAssignmentId) {
    const accepted = await prisma.assignmentSubmission.findFirst({
      where: { userId: input.userId, assignmentId: course.finalAssignmentId, status: "ACCEPTED" }
    });
    if (!accepted) {
      throw new ApiError("forbidden", "Финальное задание должно быть зачтено", 403);
    }
  }

  const number = generateCertificateNumber();
  const verificationCode = crypto.randomUUID();
  const verificationUrl = `${env.APP_URL}/certificates/verify/${verificationCode}`;
  const certificate = await prisma.certificate.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      enrollmentId: progress.enrollmentId,
      number,
      verificationCode,
      verificationUrl,
      metadata: { issuedBy: actorId }
    }
  });
  await logAudit({ actorId, action: "certificate.issued", entity: "certificate", entityId: certificate.id });
  return certificate;
}

export async function listCertificates(userId?: string) {
  return prisma.certificate.findMany({
    where: userId ? { userId } : undefined,
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } }
    },
    orderBy: { issuedAt: "desc" }
  });
}

export async function verifyCertificateByCode(verificationCode: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true, durationHours: true } }
    }
  });

  if (!certificate) {
    return null;
  }

  return {
    valid: certificate.revokedAt === null,
    number: certificate.number,
    verificationCode: certificate.verificationCode,
    verificationUrl: certificate.verificationUrl,
    studentName: certificate.user.name ?? "Слушатель академии",
    courseTitle: certificate.course.title,
    durationHours: certificate.course.durationHours,
    issuedAt: certificate.issuedAt,
    revokedAt: certificate.revokedAt
  };
}

export async function generateCertificatePdf(certificateId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { user: true, course: true }
  });
  if (!certificate) {
    throw new ApiError("not_found", "Сертификат не найден", 404);
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrPng = await QRCode.toDataURL(certificate.verificationUrl);
  const qrImage = await pdf.embedPng(qrPng);

  page.drawText("AI Strategic Academy", { x: 72, y: 500, size: 28, font: bold, color: rgb(0.07, 0.09, 0.15) });
  page.drawText("Certificate of Completion", { x: 72, y: 455, size: 20, font, color: rgb(0.25, 0.29, 0.36) });
  page.drawText(certificate.user.name ?? certificate.user.email, { x: 72, y: 390, size: 34, font: bold, color: rgb(0.12, 0.23, 0.47) });
  page.drawText(certificate.course.title, { x: 72, y: 340, size: 22, font, color: rgb(0.07, 0.09, 0.15) });
  page.drawText(`Certificate number: ${certificate.number}`, { x: 72, y: 285, size: 12, font });
  page.drawText(`Issued: ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 72, y: 260, size: 12, font });
  page.drawImage(qrImage, { x: 640, y: 80, width: 120, height: 120 });
  page.drawText("Verify online", { x: 656, y: 60, size: 10, font });

  return pdf.save();
}
