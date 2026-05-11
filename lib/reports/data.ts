import { getPrisma } from "@/lib/prisma";
import type { ProgressRow, RiskRow, CertificateRow } from "./types";

const prisma = getPrisma();

export async function fetchProgressData(studentIds?: string[]) {
  const where = studentIds ? { userId: { in: studentIds } } : {};
  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { id: true, title: true } },
      cohort: { select: { name: true } },
      courseProgress: { select: { percent: true } },
    },
    orderBy: [{ course: { title: "asc" } }, { cohort: { name: "asc" } }, { user: { name: "asc" } }],
  });

  const rows: ProgressRow[] = enrollments.map((e) => ({
    studentName: e.user.name || e.user.email,
    email: e.user.email,
    course: e.course.title,
    cohort: e.cohort?.name || "Без потока",
    progressPercent: e.courseProgress[0]?.percent ?? 0,
  }));

  return rows;
}

export async function fetchRiskData(studentIds?: string[]) {
  const where = studentIds ? { userId: { in: studentIds } } : {};
  const risks = await prisma.riskFlag.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ severity: "desc" }, { user: { name: "asc" } }],
  });

  const rows: RiskRow[] = risks.map((r) => ({
    studentName: r.user.name || r.user.email,
    email: r.user.email,
    course: r.course?.title || "—",
    type: r.type,
    severity: r.severity,
    status: r.status,
  }));

  return rows;
}

export async function fetchCertificateData() {
  const certs = await prisma.certificate.findMany({
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ issuedAt: "desc" }],
  });

  const rows: CertificateRow[] = certs.map((c) => ({
    number: c.number,
    studentName: c.user.name || c.user.email,
    email: c.user.email,
    course: c.course.title,
    issuedAt: c.issuedAt.toISOString().slice(0, 10),
  }));

  return rows;
}

export function groupByCourse<T extends { course: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const existing = map.get(row.course) ?? [];
    existing.push(row);
    map.set(row.course, existing);
  }
  return map;
}
