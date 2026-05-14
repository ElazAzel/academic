import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
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

export async function revokeCertificate(certificateId: string, actorId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { id: true, revokedAt: true }
  });
  if (!certificate) {
    throw new ApiError("not_found", "Сертификат не найден", 404);
  }
  if (certificate.revokedAt) {
    throw new ApiError("bad_request", "Сертификат уже отозван", 400);
  }

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: { revokedAt: new Date() }
  });

  await logAudit({
    actorId,
    action: "certificate.revoked",
    entity: "certificate",
    entityId: certificate.id,
    metadata: { revokedAt: updated.revokedAt }
  });

  return updated;
}

export async function listCertificates(filter?: { userId?: string; userIds?: string[] }) {
  let where: Record<string, unknown> | undefined;
  if (filter?.userId) {
    where = { userId: filter.userId };
  } else if (filter?.userIds) {
    where = { userId: { in: filter.userIds } };
  }
  return prisma.certificate.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, organization: true } },
      course: { select: { id: true, title: true } }
    },
    orderBy: { issuedAt: "desc" }
  });
}

export async function verifyCertificateByCode(verificationCode: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { verificationCode },
    include: {
      user: { select: { name: true, organization: true } },
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
    studentName: certificate.user.organization ?? certificate.user.name ?? "Слушатель академии",
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
  const pageWidth = 842;
  const pageHeight = 595;
  const page = pdf.addPage([pageWidth, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const qrPng = await QRCode.toDataURL(certificate.verificationUrl);
  const qrImage = await pdf.embedPng(qrPng);

  // Load assets safely
  const assetsDir = path.join(process.cwd(), "public/assets/certificates");

  try {
    const borderPath = path.join(assetsDir, "border.png");
    if (fs.existsSync(borderPath)) {
      const borderBytes = fs.readFileSync(borderPath);
      const borderImage = await pdf.embedPng(borderBytes);
      page.drawImage(borderImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }
  } catch (e) {
    console.error("Failed to load border asset:", e);
  }

  // Fallback border if image not available or as a supplementary frame
  page.drawRectangle({
    x: 20, y: 20, width: pageWidth - 40, height: pageHeight - 40,
    borderColor: rgb(0.12, 0.23, 0.47), borderWidth: 2,
  });
  page.drawRectangle({
    x: 25, y: 25, width: pageWidth - 50, height: pageHeight - 50,
    borderColor: rgb(0.85, 0.73, 0.35), borderWidth: 1,
  });

  // Typography and Layout
  const textTitle = "AI Strategic Academy";
  const titleWidth = bold.widthOfTextAtSize(textTitle, 36);
  page.drawText(textTitle, { x: (pageWidth - titleWidth) / 2, y: 500, size: 36, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textSubtitle = "CERTIFICATE OF COMPLETION";
  const subtitleWidth = font.widthOfTextAtSize(textSubtitle, 16);
  page.drawText(textSubtitle, { x: (pageWidth - subtitleWidth) / 2, y: 460, size: 16, font, color: rgb(0.4, 0.4, 0.4) });

  const textPresentedTo = "This is proudly presented to";
  const presentedWidth = italic.widthOfTextAtSize(textPresentedTo, 14);
  page.drawText(textPresentedTo, { x: (pageWidth - presentedWidth) / 2, y: 420, size: 14, font: italic, color: rgb(0.3, 0.3, 0.3) });

  const studentName = certificate.user.organization ?? certificate.user.name ?? certificate.user.email;
  const nameWidth = bold.widthOfTextAtSize(studentName, 42);
  page.drawText(studentName, { x: (pageWidth - nameWidth) / 2, y: 360, size: 42, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textFor = "for successfully completing the course";
  const forWidth = font.widthOfTextAtSize(textFor, 14);
  page.drawText(textFor, { x: (pageWidth - forWidth) / 2, y: 320, size: 14, font, color: rgb(0.3, 0.3, 0.3) });

  const courseTitle = certificate.course.title;
  const courseWidth = bold.widthOfTextAtSize(courseTitle, 24);
  page.drawText(courseTitle, { x: (pageWidth - courseWidth) / 2, y: 280, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });

  // Signatures and Seals
  try {
    const signaturePath = path.join(assetsDir, "signature.png");
    if (fs.existsSync(signaturePath)) {
      const signatureBytes = fs.readFileSync(signaturePath);
      const signatureImage = await pdf.embedPng(signatureBytes);
      page.drawImage(signatureImage, { x: 150, y: 130, width: 120, height: 40 });
    }
  } catch (e) {
    console.error("Failed to load signature asset:", e);
  }

  page.drawLine({ start: { x: 120, y: 120 }, end: { x: 300, y: 120 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  page.drawText("Authorized Signature", { x: 160, y: 100, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  try {
    const sealPath = path.join(assetsDir, "seal.png");
    if (fs.existsSync(sealPath)) {
      const sealBytes = fs.readFileSync(sealPath);
      const sealImage = await pdf.embedPng(sealBytes);
      page.drawImage(sealImage, { x: 360, y: 100, width: 120, height: 120 });
    }
  } catch (e) {
    console.error("Failed to load seal asset:", e);
  }

  // QR Code and Details
  page.drawImage(qrImage, { x: 620, y: 120, width: 100, height: 100 });
  page.drawText("Verify online", { x: 635, y: 100, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  page.drawText(`Certificate ID: ${certificate.number}`, { x: 60, y: 60, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`Issued: ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 60, y: 45, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}
