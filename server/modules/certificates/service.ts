import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { EnrollmentStatus } from "@prisma/client";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { env } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { logAudit } from "@/server/modules/audit/service";
import { createNotification } from "@/server/modules/notifications/service";

const prisma = getPrisma();

/**
 * Module-level cache for static image assets read from disk.
 * Avoids repeated fs reads on every PDF generation call.
 * Maps asset absolute path → raw bytes.
 */
const imageAssetCache = new Map<string, Buffer>();

async function readAssetCached(assetPath: string): Promise<Buffer | null> {
  const cached = imageAssetCache.get(assetPath);
  if (cached) return cached;
  try {
    if (fs.existsSync(assetPath)) {
      const bytes = fs.readFileSync(assetPath);
      imageAssetCache.set(assetPath, bytes);
      return bytes;
    }
  } catch {
    // not found or unreadable
  }
  return null;
}

export function generateCertificateNumber() {
  const year = new Date().getFullYear();
  return `ASA-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function completionBasis<T extends { isRequired: boolean | null }>(lessons: T[]) {
  const required = lessons.filter((lesson) => lesson.isRequired);
  return required.length > 0 ? required : lessons;
}

interface TextElementStyle {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
}

interface QrElementStyle {
  x: number;
  y: number;
  size: number;
}

interface CertificateTemplateConfig {
  backgroundUrl?: string;
  studentName?: TextElementStyle;
  courseTitle?: TextElementStyle;
  durationHours?: TextElementStyle;
  serialNumber?: TextElementStyle;
  issuedAt?: TextElementStyle;
  qrCode?: QrElementStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readAlign(value: unknown, fallback: TextElementStyle["align"]) {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function readTextStyle(value: unknown, fallback: TextElementStyle): TextElementStyle {
  const record = isRecord(value) ? value : {};
  return {
    x: readNumber(record.x, fallback.x),
    y: readNumber(record.y, fallback.y),
    fontSize: readNumber(record.fontSize, fallback.fontSize),
    color: readString(record.color, fallback.color),
    align: readAlign(record.align, fallback.align),
  };
}

function readQrStyle(value: unknown, fallback: QrElementStyle): QrElementStyle {
  const record = isRecord(value) ? value : {};
  return {
    x: readNumber(record.x, fallback.x),
    y: readNumber(record.y, fallback.y),
    size: readNumber(record.size, fallback.size),
  };
}

function readTemplateConfig(value: unknown): CertificateTemplateConfig | null {
  if (!isRecord(value)) return null;
  return {
    backgroundUrl: typeof value.backgroundUrl === "string" ? value.backgroundUrl : undefined,
    studentName: readTextStyle(value.studentName, { x: 421, y: 360, fontSize: 42, color: "#1c376f", align: "center" }),
    courseTitle: readTextStyle(value.courseTitle, { x: 421, y: 280, fontSize: 24, color: "#1a1a1a", align: "center" }),
    durationHours: readTextStyle(value.durationHours, { x: 421, y: 200, fontSize: 14, color: "#333333", align: "center" }),
    serialNumber: readTextStyle(value.serialNumber, { x: 60, y: 60, fontSize: 10, color: "#808080", align: "left" }),
    issuedAt: readTextStyle(value.issuedAt, { x: 60, y: 45, fontSize: 10, color: "#808080", align: "left" }),
    qrCode: readQrStyle(value.qrCode, { x: 620, y: 120, size: 100 }),
  };
}

export async function issueCertificate(input: { userId: string; courseId: string; force?: boolean }, actorId: string) {
  let progress = await prisma.courseProgress.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } }
  });

  let enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: input.userId, courseId: input.courseId } }
  });

  if (input.force) {
    if (!enrollment) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: input.userId,
          courseId: input.courseId,
          status: "ACTIVE"
        }
      });
    }
    if (!progress) {
      progress = await prisma.courseProgress.create({
        data: {
          userId: input.userId,
          courseId: input.courseId,
          enrollmentId: enrollment.id,
          percent: 100,
          status: "COMPLETED",
          completedAt: new Date()
        }
      });
    }
  } else {
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ApiError("forbidden", "Нет активного доступа к курсу для выдачи сертификата", 403);
    }

    if (!progress) {
      throw new ApiError("forbidden", "Условия выдачи сертификата не выполнены", 403, {
        requiredPercent: env.CERTIFICATE_COMPLETION_THRESHOLD,
        actualPercent: 0
      });
    }
    const course = await prisma.course.findUniqueOrThrow({
      where: { id: input.courseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                quizzes: { select: { id: true } },
                assignments: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (progress.percent < course.completionThreshold) {
      throw new ApiError("forbidden", "Условия выдачи сертификата не выполнены", 403, {
        requiredPercent: course.completionThreshold,
        actualPercent: progress.percent
      });
    }

    const gatedLessons = completionBasis(course.modules.flatMap((module) => module.lessons)).filter(
      (lesson) => lesson.quizzes.length > 0 || lesson.assignments.length > 0,
    );
    if (gatedLessons.length > 0) {
      const completedGatedLessons = await prisma.lessonProgress.count({
        where: {
          userId: input.userId,
          lessonId: { in: gatedLessons.map((lesson) => lesson.id) },
          status: "COMPLETED",
        },
      });
      if (completedGatedLessons !== gatedLessons.length) {
        throw new ApiError("forbidden", "Тесты и задания курса должны быть завершены перед выдачей сертификата", 403);
      }
    }

    if (course.finalAssignmentId) {
      const accepted = await prisma.assignmentSubmission.findFirst({
        where: { userId: input.userId, assignmentId: course.finalAssignmentId, status: "ACCEPTED" }
      });
      if (!accepted) {
        throw new ApiError("forbidden", "Финальное задание должно быть зачтено", 403);
      }
    }
  }

  // Защита от race condition: проверяем, не выдан ли уже сертификат
  const existingCert = await prisma.certificate.findFirst({
    where: { userId: input.userId, courseId: input.courseId }
  });
  if (existingCert) {
    throw new ApiError("conflict", "Сертификат уже выдан", 409);
  }

  const number = generateCertificateNumber();
  const verificationCode = crypto.randomUUID();
  const verificationUrl = `${env.APP_URL}/certificates/verify/${verificationCode}`;
  const certificate = await prisma.certificate.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      enrollmentId: progress?.enrollmentId ?? enrollment?.id ?? null,
      number,
      verificationCode,
      verificationUrl,
      metadata: { issuedBy: actorId, forced: !!input.force }
    }
  });
  await logAudit({ actorId, action: "certificate.issued", entity: "certificate", entityId: certificate.id });
  await createNotification({
    userId: input.userId,
    event: "certificate_available",
    refType: "certificate",
    refId: certificate.id,
    data: {
      certificateId: certificate.id,
      courseId: input.courseId,
      verificationCode,
      link: "/student/certificates"
    }
  });
  return certificate;
}

export async function claimCertificateForCourse(userId: string, courseId: string) {
  const existing = await prisma.certificate.findFirst({
    where: { userId, courseId, revokedAt: null },
    select: { id: true, number: true, courseId: true, userId: true, issuedAt: true, verificationCode: true },
  });

  if (existing) {
    return { certificate: existing, alreadyIssued: true };
  }

  try {
    const certificate = await issueCertificate({ userId, courseId }, userId);
    return { certificate, alreadyIssued: false };
  } catch (error) {
    if (error instanceof ApiError && error.code === "conflict") {
      const certificate = await prisma.certificate.findFirstOrThrow({
        where: { userId, courseId, revokedAt: null },
        select: { id: true, number: true, courseId: true, userId: true, issuedAt: true, verificationCode: true },
      });
      return { certificate, alreadyIssued: true };
    }

    throw error;
  }
}

export async function revokeCertificate(certificateId: string, actorId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { id: true, userId: true, courseId: true, revokedAt: true }
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
  await createNotification({
    userId: certificate.userId,
    event: "certificate_revoked",
    refType: "certificate",
    refId: certificate.id,
    data: {
      certificateId: certificate.id,
      courseId: certificate.courseId,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
      link: "/student/certificates"
    }
  });

  return updated;
}

export async function listCertificates(filter?: { userId?: string; userIds?: string[] }) {
  const where: Record<string, unknown> = {};
  if (filter?.userId) {
    where.userId = filter.userId;
  } else if (filter?.userIds) {
    where.userId = { in: filter.userIds };
  }
  return prisma.certificate.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    select: {
      id: true,
      number: true,
      userId: true,
      courseId: true,
      verificationCode: true,
      verificationUrl: true,
      issuedAt: true,
      revokedAt: true,
      user: { select: { id: true, name: true, email: true, organization: true } },
      course: { select: { id: true, title: true } },
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

/**
 * Загружает кириллический TTF-шрифт для PDF.
 * Пытается загрузить кастомный шрифт из public/assets/fonts/.
 * Если шрифт не найден — возвращает стандартный Helvetica (без кириллицы).
 */
async function loadCyrillicFonts(pdf: PDFDocument): Promise<{
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}> {
  const fontsDir = path.join(process.cwd(), "public/assets/fonts");
  const regularPath = path.join(fontsDir, "NotoSans-Regular.ttf");
  const boldPath = path.join(fontsDir, "NotoSans-Bold.ttf");
  const italicPath = path.join(fontsDir, "NotoSans-Italic.ttf");

  // Пробуем загрузить кириллические шрифты
  try {
    if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
      pdf.registerFontkit(fontkit);
      const regular = await pdf.embedFont(fs.readFileSync(regularPath));
      const bold = await pdf.embedFont(fs.readFileSync(boldPath));
      const italic = fs.existsSync(italicPath)
        ? await pdf.embedFont(fs.readFileSync(italicPath))
        : regular;
      console.info("[Certificate] Cyrillic fonts loaded from", fontsDir);
      return { regular, bold, italic };
    }
  } catch (e) {
    console.warn("[Certificate] Failed to load custom fonts, using Helvetica fallback:", e);
  }

  // Fallback на Helvetica (без поддержки кириллицы)
  console.warn(
    "[Certificate] Cyrillic fonts not found in",
    fontsDir,
    "— Russian text may not render correctly. " +
    "Place NotoSans-Regular.ttf and NotoSans-Bold.ttf in public/assets/fonts/"
  );
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  return { regular, bold, italic };
}

async function embedImageSafely(pdf: PDFDocument, bytes: Buffer) {
  const hex = bytes.slice(0, 4).toString("hex");
  if (hex === "89504e47") {
    return pdf.embedPng(bytes);
  } else if (hex.startsWith("ffd8")) {
    return pdf.embedJpg(bytes);
  }
  // Fallback
  try {
    return await pdf.embedPng(bytes);
  } catch {
    return await pdf.embedJpg(bytes);
  }
}

export async function generateCertificatePdf(certificateId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      number: true,
      verificationCode: true,
      verificationUrl: true,
      issuedAt: true,
      revokedAt: true,
      courseId: true,
      user: { select: { name: true, email: true, organization: true } },
      course: { select: { title: true, durationHours: true } },
    },
  });
  if (!certificate) {
    throw new ApiError("not_found", "Сертификат не найден", 404);
  }

  const pdf = await PDFDocument.create();
  const pageWidth = 842;
  const pageHeight = 595;
  const page = pdf.addPage([pageWidth, pageHeight]);

  // Загружаем шрифты (с кириллицей, если доступны)
  const { regular: font, bold, italic } = await loadCyrillicFonts(pdf);

  // Динамически исправляем localhost в URL верификации для QR-кода на продакшене
  let qrUrl = certificate.verificationUrl;
  if (process.env.VERCEL_URL && qrUrl.includes("localhost")) {
    qrUrl = `https://${process.env.VERCEL_URL}/certificates/verify/${certificate.verificationCode}`;
  } else if (env.APP_URL && !env.APP_URL.includes("localhost") && qrUrl.includes("localhost")) {
    qrUrl = `${env.APP_URL}/certificates/verify/${certificate.verificationCode}`;
  }

  const qrPngBuffer = await QRCode.toBuffer(qrUrl, { type: "png" });
  const qrImage = await pdf.embedPng(qrPngBuffer);

  // Load custom template if exists
  const template = await prisma.certificateTemplate.findFirst({
    where: { courseId: certificate.courseId },
  });

  let drawCustom = false;
  const config = template ? readTemplateConfig(template.body) : null;
  if (config?.backgroundUrl) {
    drawCustom = true;
  }

  if (drawCustom) {
    try {
      const bgRes = await fetch(config?.backgroundUrl ?? "");
      if (bgRes.ok) {
        const bgBytes = await bgRes.arrayBuffer();
        const bgBuffer = Buffer.from(bgBytes);
        const bgImage = await embedImageSafely(pdf, bgBuffer);
        page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      } else {
        console.warn(`[Certificate PDF] Failed to fetch custom background URL: ${config?.backgroundUrl ?? ""}, status ${bgRes.status}. Using default template.`);
        drawCustom = false;
      }
    } catch (e) {
      console.error("[Certificate PDF] Error fetching custom background. Using default:", e);
      drawCustom = false;
    }
  }

  if (drawCustom) {
    // Draw customizable elements based on template coordinates
    const nameStyle = config?.studentName ?? { x: 421, y: 360, fontSize: 42, color: "#1c376f", align: "center" };
    const nameText = certificate.user.organization ?? certificate.user.name ?? certificate.user.email;
    drawTextElement(page, nameText, nameStyle, bold);

    const courseStyle = config?.courseTitle ?? { x: 421, y: 280, fontSize: 24, color: "#1a1a1a", align: "center" };
    const courseText = certificate.course.title;
    drawTextElement(page, courseText, courseStyle, bold);

    const hoursStyle = config?.durationHours ?? { x: 421, y: 200, fontSize: 14, color: "#333333", align: "center" };
    const hoursText = `Количество часов: ${certificate.course.durationHours ?? 72}`;
    drawTextElement(page, hoursText, hoursStyle, font);

    const serialStyle = config?.serialNumber ?? { x: 60, y: 60, fontSize: 10, color: "#808080", align: "left" };
    const serialText = `Номер: ${certificate.number}`;
    drawTextElement(page, serialText, serialStyle, font);

    const dateStyle = config?.issuedAt ?? { x: 60, y: 45, fontSize: 10, color: "#808080", align: "left" };
    const dateText = `Дата выдачи: ${certificate.issuedAt.toISOString().slice(0, 10)}`;
    drawTextElement(page, dateText, dateStyle, font);

    const qrStyle = config?.qrCode ?? { x: 620, y: 120, size: 100 };
    page.drawImage(qrImage, { x: Number(qrStyle.x), y: Number(qrStyle.y), width: Number(qrStyle.size), height: Number(qrStyle.size) });

    return pdf.save();
  }

  // Fallback to default border and signature assets
  const assetsDir = path.join(process.cwd(), "public/assets/certificates");

  const borderBytes = await readAssetCached(path.join(assetsDir, "border.png"));
  if (borderBytes) {
    try {
      const borderImage = await embedImageSafely(pdf, borderBytes);
      page.drawImage(borderImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    } catch (e) {
      console.error("Failed to embed border asset:", e);
    }
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

  // Typography and Layout — все тексты на русском
  const textTitle = "AI Strategic Academy";
  const titleWidth = bold.widthOfTextAtSize(textTitle, 36);
  page.drawText(textTitle, { x: (pageWidth - titleWidth) / 2, y: 500, size: 36, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textSubtitle = "СВИДЕТЕЛЬСТВО О ЗАВЕРШЕНИИ";
  const subtitleWidth = font.widthOfTextAtSize(textSubtitle, 16);
  page.drawText(textSubtitle, { x: (pageWidth - subtitleWidth) / 2, y: 460, size: 16, font, color: rgb(0.4, 0.4, 0.4) });

  const textPresentedTo = "Настоящее свидетельство вручается";
  const presentedWidth = italic.widthOfTextAtSize(textPresentedTo, 14);
  page.drawText(textPresentedTo, { x: (pageWidth - presentedWidth) / 2, y: 420, size: 14, font: italic, color: rgb(0.3, 0.3, 0.3) });

  const studentName = certificate.user.organization ?? certificate.user.name ?? certificate.user.email;
  const nameWidth = bold.widthOfTextAtSize(studentName, 42);
  page.drawText(studentName, { x: (pageWidth - nameWidth) / 2, y: 360, size: 42, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textFor = "за успешное прохождение курса";
  const forWidth = font.widthOfTextAtSize(textFor, 14);
  page.drawText(textFor, { x: (pageWidth - forWidth) / 2, y: 320, size: 14, font, color: rgb(0.3, 0.3, 0.3) });

  const courseTitle = certificate.course.title;
  const courseWidth = bold.widthOfTextAtSize(courseTitle, 24);
  page.drawText(courseTitle, { x: (pageWidth - courseWidth) / 2, y: 280, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });

  // Отображаем уникальный номер сертификата по центру золотым шрифтом
  const textNumber = `Сертификат № ${certificate.number}`;
  const numberWidth = bold.widthOfTextAtSize(textNumber, 14);
  page.drawText(textNumber, { x: (pageWidth - numberWidth) / 2, y: 240, size: 14, font: bold, color: rgb(0.85, 0.73, 0.35) });

  // Signatures and Seals
  const signatureBytes = await readAssetCached(path.join(assetsDir, "signature.png"));
  if (signatureBytes) {
    try {
      const signatureImage = await embedImageSafely(pdf, signatureBytes);
      page.drawImage(signatureImage, { x: 150, y: 130, width: 120, height: 40 });
    } catch (e) {
      console.error("Failed to embed signature asset:", e);
    }
  }

  page.drawLine({ start: { x: 120, y: 120 }, end: { x: 300, y: 120 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  page.drawText("Уполномоченное лицо", { x: 160, y: 100, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  const sealBytes = await readAssetCached(path.join(assetsDir, "seal.png"));
  if (sealBytes) {
    try {
      const sealImage = await embedImageSafely(pdf, sealBytes);
      page.drawImage(sealImage, { x: 360, y: 100, width: 120, height: 120 });
    } catch (e) {
      console.error("Failed to embed seal asset:", e);
    }
  }

  // QR Code and Details
  page.drawImage(qrImage, { x: 620, y: 120, width: 100, height: 100 });
  page.drawText("Проверить онлайн", { x: 620, y: 100, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  page.drawText(`Номер: ${certificate.number}`, { x: 60, y: 60, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`Дата выдачи: ${certificate.issuedAt.toISOString().slice(0, 10)}`, { x: 60, y: 45, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}

export async function generateDraftCertificatePdf(courseId: string, customConfig: unknown) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, durationHours: true }
  });
  if (!course) {
    throw new ApiError("not_found", "Курс не найден", 404);
  }

  const pdf = await PDFDocument.create();
  const pageWidth = 842;
  const pageHeight = 595;
  const page = pdf.addPage([pageWidth, pageHeight]);

  // Загружаем шрифты (с кириллицей, если доступны)
  const { regular: font, bold } = await loadCyrillicFonts(pdf);

  // Генерируем тестовый URL верификации для QR-кода
  const dummyVerificationCode = "DRAFT-VERIFICATION-CODE-PREVIEW";
  const qrUrl = `${env.APP_URL || "https://strategic-academy.local"}/certificates/verify/${dummyVerificationCode}`;
  const qrPngBuffer = await QRCode.toBuffer(qrUrl, { type: "png" });
  const qrImage = await pdf.embedPng(qrPngBuffer);

  const config = readTemplateConfig(customConfig);
  let drawCustom = false;
  if (config?.backgroundUrl) {
    drawCustom = true;
  }

  if (drawCustom) {
    try {
      const bgRes = await fetch(config?.backgroundUrl ?? "");
      if (bgRes.ok) {
        const bgBytes = await bgRes.arrayBuffer();
        const bgBuffer = Buffer.from(bgBytes);
        const bgImage = await embedImageSafely(pdf, bgBuffer);
        page.drawImage(bgImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      } else {
        drawCustom = false;
      }
    } catch {
      drawCustom = false;
    }
  }

  const dummyStudentName = "Иванов Иван Иванович";
  const dummyCertNumber = "ASA-2026-DRAFT";
  const dummyIssuedDate = new Date();

  if (drawCustom) {
    const nameStyle = config?.studentName ?? { x: 421, y: 360, fontSize: 42, color: "#1c376f", align: "center" };
    drawTextElement(page, dummyStudentName, nameStyle, bold);

    const courseStyle = config?.courseTitle ?? { x: 421, y: 280, fontSize: 24, color: "#1a1a1a", align: "center" };
    drawTextElement(page, course.title, courseStyle, bold);

    const hoursStyle = config?.durationHours ?? { x: 421, y: 200, fontSize: 14, color: "#333333", align: "center" };
    drawTextElement(page, `Количество часов: ${course.durationHours ?? 72}`, hoursStyle, font);

    const serialStyle = config?.serialNumber ?? { x: 60, y: 60, fontSize: 10, color: "#808080", align: "left" };
    drawTextElement(page, `Номер: ${dummyCertNumber}`, serialStyle, font);

    const dateStyle = config?.issuedAt ?? { x: 60, y: 45, fontSize: 10, color: "#808080", align: "left" };
    drawTextElement(page, `Дата выдачи: ${dummyIssuedDate.toISOString().slice(0, 10)}`, dateStyle, font);

    const qrStyle = config?.qrCode ?? { x: 620, y: 120, size: 100 };
    page.drawImage(qrImage, { x: Number(qrStyle.x), y: Number(qrStyle.y), width: Number(qrStyle.size), height: Number(qrStyle.size) });

    return pdf.save();
  }

  // Отрисовка стандартного бланка по умолчанию с тестовыми данными
  const assetsDir = path.join(process.cwd(), "public/assets/certificates");
  const borderBytes = await readAssetCached(path.join(assetsDir, "border.png"));
  if (borderBytes) {
    try {
      const borderImage = await embedImageSafely(pdf, borderBytes);
      page.drawImage(borderImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    } catch { /* ignore */ }
  }

  page.drawRectangle({
    x: 20, y: 20, width: pageWidth - 40, height: pageHeight - 40,
    borderColor: rgb(0.12, 0.23, 0.47), borderWidth: 2,
  });
  page.drawRectangle({
    x: 25, y: 25, width: pageWidth - 50, height: pageHeight - 50,
    borderColor: rgb(0.85, 0.73, 0.35), borderWidth: 1,
  });

  const textTitle = "AI Strategic Academy";
  const titleWidth = bold.widthOfTextAtSize(textTitle, 36);
  page.drawText(textTitle, { x: (pageWidth - titleWidth) / 2, y: 500, size: 36, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textSubtitle = "СВИДЕТЕЛЬСТВО О ЗАВЕРШЕНИИ (ЧЕРНОВИК)";
  const subtitleWidth = font.widthOfTextAtSize(textSubtitle, 16);
  page.drawText(textSubtitle, { x: (pageWidth - subtitleWidth) / 2, y: 460, size: 16, font, color: rgb(0.4, 0.4, 0.4) });

  const textPresentedTo = "Настоящее свидетельство вручается";
  const presentedWidth = font.widthOfTextAtSize(textPresentedTo, 14);
  page.drawText(textPresentedTo, { x: (pageWidth - presentedWidth) / 2, y: 420, size: 14, font, color: rgb(0.3, 0.3, 0.3) });

  const nameWidth = bold.widthOfTextAtSize(dummyStudentName, 42);
  page.drawText(dummyStudentName, { x: (pageWidth - nameWidth) / 2, y: 360, size: 42, font: bold, color: rgb(0.12, 0.23, 0.47) });

  const textFor = "за успешное прохождение курса";
  const forWidth = font.widthOfTextAtSize(textFor, 14);
  page.drawText(textFor, { x: (pageWidth - forWidth) / 2, y: 320, size: 14, font, color: rgb(0.3, 0.3, 0.3) });

  const courseTitle = course.title;
  const courseWidth = bold.widthOfTextAtSize(courseTitle, 24);
  page.drawText(courseTitle, { x: (pageWidth - courseWidth) / 2, y: 280, size: 24, font: bold, color: rgb(0.1, 0.1, 0.1) });

  const textNumber = `Сертификат № ${dummyCertNumber}`;
  const numberWidth = bold.widthOfTextAtSize(textNumber, 14);
  page.drawText(textNumber, { x: (pageWidth - numberWidth) / 2, y: 240, size: 14, font: bold, color: rgb(0.85, 0.73, 0.35) });

  // Подпись и печать
  const signatureBytes = await readAssetCached(path.join(assetsDir, "signature.png"));
  if (signatureBytes) {
    try {
      const signatureImage = await embedImageSafely(pdf, signatureBytes);
      page.drawImage(signatureImage, { x: 150, y: 130, width: 120, height: 40 });
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: 120, y: 120 }, end: { x: 300, y: 120 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
  page.drawText("Уполномоченное лицо", { x: 160, y: 100, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  const sealBytes = await readAssetCached(path.join(assetsDir, "seal.png"));
  if (sealBytes) {
    try {
      const sealImage = await embedImageSafely(pdf, sealBytes);
      page.drawImage(sealImage, { x: 360, y: 100, width: 120, height: 120 });
    } catch { /* ignore */ }
  }

  page.drawImage(qrImage, { x: 620, y: 120, width: 100, height: 100 });
  page.drawText("Проверить онлайн", { x: 620, y: 100, size: 10, font, color: rgb(0.3, 0.3, 0.3) });

  page.drawText(`Номер: ${dummyCertNumber}`, { x: 60, y: 60, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
  page.drawText(`Дата выдачи: ${dummyIssuedDate.toISOString().slice(0, 10)}`, { x: 60, y: 45, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

  return pdf.save();
}

function hexToRgb(hex = "#000000") {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

function drawTextElement(page: PDFPage, text: string, style: TextElementStyle, font: PDFFont) {
  const x = Number(style.x);
  const y = Number(style.y);
  const size = Number(style.fontSize || 14);
  const textColor = hexToRgb(style.color || "#000000");

  if (style.align === "center") {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: x - textWidth / 2,
      y: y,
      size: size,
      font: font,
      color: textColor,
    });
  } else if (style.align === "right") {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: x - textWidth,
      y: y,
      size: size,
      font: font,
      color: textColor,
    });
  } else {
    page.drawText(text, {
      x: x,
      y: y,
      size: size,
      font: font,
      color: textColor,
    });
  }
}
