import { getPrisma } from "@/lib/prisma";
import type { ProgressRow, RiskRow, CertificateRow } from "./types";

const prisma = getPrisma();

export async function fetchProgressData(studentIds?: string[]) {
  const where = studentIds ? { userId: { in: studentIds } } : {};
  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, lastLoginAt: true } },
      course: { select: { id: true, title: true } },
      cohort: { select: { name: true } },
      courseProgress: { select: { percent: true } },
    },
    orderBy: [{ course: { title: "asc" } }, { cohort: { name: "asc" } }, { user: { name: "asc" } }],
  });

  const userIds = enrollments.map((e) => e.userId);

  // Latest lesson progress with module/block/lesson info per user
  const latestProgressList = await prisma.lessonProgress.findMany({
    where: { userId: { in: userIds } },
    orderBy: [{ userId: "asc" }, { updatedAt: "desc" }],
    distinct: ["userId"],
    include: {
      lesson: {
        include: {
          block: { select: { title: true } },
          module: { select: { title: true } },
        }
      }
    },
  });

  const progressMap = new Map(latestProgressList.map((lp) => [lp.userId, lp]));

  // Avg lesson time
  const allLessonProgress = await prisma.lessonProgress.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, lesson: { select: { durationMinutes: true } } },
  });
  const timeMap = new Map<string, { count: number; total: number }>();
  for (const lp of allLessonProgress) {
    const cur = timeMap.get(lp.userId) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += lp.lesson.durationMinutes;
    timeMap.set(lp.userId, cur);
  }

  // Risk counts
  const riskCounts = await prisma.riskFlag.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: "open" },
    _count: { _all: true },
  });
  const riskMap = new Map(riskCounts.map((r) => [r.userId, r._count._all]));

  const rows: ProgressRow[] = enrollments.map((e) => {
    const lp = progressMap.get(e.userId);
    const td = timeMap.get(e.userId);
    return {
      studentName: e.user.name || e.user.email,
      email: e.user.email,
      course: e.course.title,
      cohort: e.cohort?.name || "Без потока",
      progressPercent: e.courseProgress[0]?.percent ?? 0,
      currentModule: lp?.lesson.module.title,
      currentBlock: lp?.lesson.block?.title,
      currentLesson: lp?.lesson.title,
      lastLoginAt: e.user.lastLoginAt?.toISOString() ?? undefined,
      avgLessonMinutes: td && td.count > 0 ? Math.round(td.total / td.count) : 0,
      riskCount: riskMap.get(e.userId) ?? 0,
    };
  });

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
