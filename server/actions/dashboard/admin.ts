"use server";

import { withQueryFallback, getStudentAnalyticsDetail } from "./shared";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/page-guards";
import type {
  CourseSummary,
  CohortSummary,
  CertificateSummary,
  DashboardMetric,
  StudentAnalyticsDetail,
} from "@/types/domain";

export async function getAdminDashboard() {
  await requireRole(["admin"]);
  return withQueryFallback(async () => {
    const [
      coursesCount,
      cohortsCount,
      usersCount,
      certsCount,
      courses,
      cohorts,
      certificates
    ] = await Promise.all([
      prisma.course.count(),
      prisma.cohort.count(),
      prisma.user.count(),
      prisma.certificate.count(),
      prisma.course.findMany({
        orderBy: { createdAt: "desc" },
        take: QUERY_LIMITS.reportSummaryCourses,
        include: {
          modules: { include: { _count: { select: { lessons: true } } } },
          instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
          _count: { select: { modules: true } },
        },
      }),
      prisma.cohort.findMany({
        orderBy: { createdAt: "desc" },
        take: QUERY_LIMITS.dashboardQueue,
        include: { course: { select: { title: true } }, _count: { select: { enrollments: true } } },
      }),
      prisma.certificate.findMany({
        orderBy: { issuedAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } }, course: { select: { title: true } } },
      }),
    ]);

    const formattedCourses: CourseSummary[] = courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      coverUrl: c.coverUrl,
      durationHours: c.durationHours,
      status: c.status as CourseSummary["status"],
      traversalMode: c.traversalMode as "sequential" | "open",
      modulesCount: c._count.modules,
      blocksCount: 0,
      lessonsCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
      instructors: c.instructors.map((ci) => ({
        id: ci.user.id,
        name: ci.user.name ?? "",
        email: ci.user.email,
      })),
    }));

    const formattedCohorts: CohortSummary[] = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      courseTitle: c.course?.title ?? "",
      startsAt: c.startsAt?.toISOString().slice(0, 10) ?? null,
      endsAt: c.endsAt?.toISOString().slice(0, 10) ?? null,
      status: c.status,
      studentsCount: c._count.enrollments,
    }));

    const formattedCerts: CertificateSummary[] = certificates.map((c) => ({
      id: c.id,
      number: c.number,
      courseTitle: c.course.title,
      studentName: c.user.name ?? "",
      issuedAt: c.issuedAt.toISOString(),
      verificationUrl: c.verificationUrl,
    }));

    const metrics: DashboardMetric[] = [
      { label: "Курсы", value: coursesCount, tone: "primary" },
      { label: "Потоки", value: cohortsCount, tone: "info" },
      { label: "Пользователи", value: usersCount, tone: "success" },
      { label: "Сертификаты", value: certsCount, tone: "warning" },
    ];

    return { metrics, courses: formattedCourses, cohorts: formattedCohorts, certificates: formattedCerts };
  }, null);
}

export async function getEnrollmentData(): Promise<{
  students: { id: string; name: string | null; email: string }[];
  courses: { id: string; title: string }[];
  cohorts: { id: string; name: string; courseId: string }[];
  curators: { id: string; name: string | null; email: string }[];
}> {
  await requireRole(["admin"]);

  return withQueryFallback(async () => {
    const [students, courses, cohorts, curators] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { role: { key: "student" } } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
        take: QUERY_LIMITS.dashboardStudents,
      }),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
        take: QUERY_LIMITS.reportSummaryCourses,
      }),
      prisma.cohort.findMany({
        where: { status: "active" },
        select: { id: true, name: true, courseId: true },
        orderBy: { name: "asc" },
        take: QUERY_LIMITS.dashboardQueue,
      }),
      prisma.user.findMany({
        where: { roles: { some: { role: { key: { in: ["curator", "super_curator"] } } } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
        take: QUERY_LIMITS.dashboardStudents,
      })
    ]);

    return {
      students,
      courses,
      cohorts: cohorts.map(c => ({
        id: c.id,
        name: c.name,
        courseId: c.courseId ?? ""
      })),
      curators
    };
  }, {
    students: [] as { id: string; name: string | null; email: string }[],
    courses: [] as { id: string; title: string }[],
    cohorts: [] as { id: string; name: string; courseId: string }[],
    curators: [] as { id: string; name: string | null; email: string }[]
  });
}

export async function getAdminStudentAnalytics(): Promise<StudentAnalyticsDetail[]> {
  await requireRole(["admin"]);

  return withQueryFallback(async () => {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true },
      take: QUERY_LIMITS.reportRows,
    });
    const studentIds = [...new Set(enrollments.map((e) => e.userId))];
    return getStudentAnalyticsDetail(studentIds);
  }, []);
}
