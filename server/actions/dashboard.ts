"use server";

/**
 * Server Actions для получения данных дашбордов.
 * Используют реальный Prisma client для запросов к PostgreSQL.
 * При отсутствии БД gracefully возвращают mock-данные.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import type {
  ContinueLearning,
  CourseSummary,
  CuratorLoad,
  DashboardMetric,
  QuestionFromStudent,
  RiskItem,
  StudentProgress,
  SubmissionForReview,
  CohortSummary,
  CertificateSummary,
  InviteLinkSummary,
} from "@/types/domain";

// ── Вспомогательные ─────────────────────────────────────────────────

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    // Если БД недоступна — возвращаем fallback
    console.warn("[dashboard-actions] DB query failed, returning fallback");
    return fallback;
  }
}

// ── Слушатель ───────────────────────────────────────────────────────

export async function getStudentDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        course: { select: { id: true, slug: true, title: true, description: true, durationHours: true, status: true } },
        courseProgress: true,
        cohort: { include: { deadlines: { include: { module: true } } } },
      },
    });

    const coursesProgress: StudentProgress[] = enrollments.map((e) => {
      const cp = e.courseProgress[0];
      return {
        courseId: e.course.id,
        courseTitle: e.course.title,
        percent: cp?.percent ?? 0,
        status: (cp?.status as StudentProgress["status"]) ?? "NOT_STARTED",
      };
    });

    // Продолжить обучение — последний незавершённый урок
    const lastProgress = await prisma.lessonProgress.findFirst({
      where: { userId: user.id, status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
      orderBy: { updatedAt: "desc" },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });

    let continueLearning: ContinueLearning | null = null;
    if (lastProgress) {
      const lesson = lastProgress.lesson;
      const course = lesson.module.course;
      const cp = await prisma.courseProgress.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      const mp = await prisma.moduleProgress.findUnique({
        where: { userId_moduleId: { userId: user.id, moduleId: lesson.moduleId } },
      });
      continueLearning = {
        courseId: course.id,
        courseTitle: course.title,
        moduleTitle: lesson.module.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        coursePercent: cp?.percent ?? 0,
        modulePercent: mp?.percent ?? 0,
      };
    }

    // Ответы куратора
    const questions = await prisma.lessonQuestion.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    const formattedQuestions: QuestionFromStudent[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: user.name ?? user.email,
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: q.status as "open" | "answered",
      createdAt: q.createdAt.toISOString(),
      answer: q.answer,
      answeredAt: q.answeredAt?.toISOString(),
    }));

    const activeCourses = enrollments.filter((e) => {
      const cp = e.courseProgress[0];
      return cp?.status !== "COMPLETED";
    }).length;

    const avgPercent = coursesProgress.length > 0
      ? Math.round(coursesProgress.reduce((s, c) => s + c.percent, 0) / coursesProgress.length)
      : 0;

    const certificatesCount = await prisma.certificate.count({ where: { userId: user.id } });

    const openQuestionsCount = formattedQuestions.filter((q) => q.status === "open").length;

    const metrics: DashboardMetric[] = [
      { label: "Активные курсы", value: activeCourses, tone: "primary" },
      { label: "Средний прогресс", value: `${avgPercent}%`, tone: avgPercent > 50 ? "success" : "warning" },
      { label: "Сертификаты", value: certificatesCount, tone: "success" },
      { label: "Вопросы куратору", value: openQuestionsCount, tone: openQuestionsCount > 0 ? "info" : "primary" },
    ];

    return { metrics, coursesProgress, continueLearning, questions: formattedQuestions };
  }, null);
}

// ── Куратор ─────────────────────────────────────────────────────────

export async function getCuratorDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    // Найти слушателей куратора
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      select: { studentId: true, cohort: { select: { id: true, name: true, courseId: true, course: { select: { title: true } } } } },
    });
    const studentIds = assignments.map((a) => a.studentId);

    // Вопросы
    const questions = await prisma.lessonQuestion.findMany({
      where: { curatorId: user.id, status: "open" },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    const formattedQuestions: QuestionFromStudent[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: q.student.name ?? q.student.email,
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: "open" as const,
      createdAt: q.createdAt.toISOString(),
    }));

    // Задания на проверку
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { userId: { in: studentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      orderBy: { submittedAt: "desc" },
      include: {
        assignment: { include: { course: true, lesson: true } },
        user: { select: { name: true, email: true } },
      },
    });

    const formattedSubmissions: SubmissionForReview[] = submissions.map((s) => ({
      id: s.id,
      assignmentTitle: s.assignment.title,
      studentName: s.user.name ?? s.user.email,
      studentEmail: s.user.email,
      courseTitle: s.assignment.course?.title ?? "",
      lessonTitle: s.assignment.lesson?.title ?? "",
      answerText: s.answerText,
      fileUrl: s.fileUrl,
      attemptNumber: s.attemptNumber,
      submittedAt: s.submittedAt.toISOString(),
      status: s.status as SubmissionForReview["status"],
    }));

    // Риски
    const risks = await prisma.riskFlag.findMany({
      where: { userId: { in: studentIds }, status: "open" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
        cohort: { select: { name: true } },
      },
    });

    const formattedRisks: RiskItem[] = risks.map((r) => ({
      id: r.id,
      type: r.type as RiskItem["type"],
      severity: r.severity as RiskItem["severity"],
      studentName: r.user.name ?? r.user.email,
      studentEmail: r.user.email,
      courseTitle: r.course?.title ?? "",
      cohortName: r.cohort?.name,
      status: "open" as const,
      createdAt: r.createdAt.toISOString(),
    }));

    const metrics: DashboardMetric[] = [
      { label: "Мои слушатели", value: studentIds.length, tone: "primary" },
      { label: "Открытые вопросы", value: formattedQuestions.length, tone: formattedQuestions.length > 3 ? "danger" : "success" },
      { label: "Задания на проверку", value: formattedSubmissions.length, tone: formattedSubmissions.length > 5 ? "warning" : "success" },
      { label: "Слушатели с рисками", value: formattedRisks.length, tone: formattedRisks.length > 3 ? "danger" : "success" },
    ];

    return { metrics, questions: formattedQuestions, submissions: formattedSubmissions, risks: formattedRisks };
  }, null);
}

// ── Супер-куратор ───────────────────────────────────────────────────

export async function getSuperCuratorDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const curatorAssignments = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      include: {
        curator: { select: { id: true, name: true, email: true } },
        cohort: { select: { id: true, name: true, courseId: true, course: { select: { title: true } } } },
      },
    });

    // Группировка по кураторам
    const curatorMap = new Map<string, { name: string; studentIds: Set<string> }>();
    for (const ca of curatorAssignments) {
      const key = ca.curatorId;
      if (!curatorMap.has(key)) {
        curatorMap.set(key, { name: ca.curator.name ?? ca.curator.email, studentIds: new Set() });
      }
      curatorMap.get(key)!.studentIds.add(ca.studentId);
    }

    const curatorLoads: CuratorLoad[] = [];
    for (const [curatorId, data] of curatorMap) {
      const studentIds = Array.from(data.studentIds);
      const openQuestions = await prisma.lessonQuestion.count({ where: { curatorId, status: "open" } });
      const pendingReviews = await prisma.assignmentSubmission.count({
        where: { userId: { in: studentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      });
      const riskStudents = await prisma.riskFlag.count({
        where: { userId: { in: studentIds }, status: "open" },
      });
      curatorLoads.push({
        curatorId,
        curatorName: data.name,
        studentsCount: studentIds.length,
        openQuestions,
        pendingReviews,
        avgResponseHours: 0,
        riskStudents,
      });
    }

    // Потоки
    const cohortIds = [...new Set(curatorAssignments.map((ca) => ca.cohortId))];
    const cohorts = await prisma.cohort.findMany({
      where: { id: { in: cohortIds } },
      include: { course: { select: { title: true } }, _count: { select: { enrollments: true } } },
    });
    const formattedCohorts: CohortSummary[] = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      courseTitle: c.course?.title ?? "",
      startsAt: c.startsAt?.toISOString().slice(0, 10) ?? null,
      endsAt: c.endsAt?.toISOString().slice(0, 10) ?? null,
      status: c.status,
      studentsCount: c._count.enrollments,
    }));

    const totalStudents = curatorLoads.reduce((s, c) => s + c.studentsCount, 0);
    const metrics: DashboardMetric[] = [
      { label: "Кураторов", value: curatorLoads.length, tone: "primary" },
      { label: "Всего слушателей", value: totalStudents, tone: "info" },
      { label: "Потоков", value: formattedCohorts.length, tone: "info" },
      { label: "Кураторы с перегрузкой", value: curatorLoads.filter((c) => c.studentsCount > 15).length, tone: "warning" },
    ];

    return { metrics, curatorLoads, cohorts: formattedCohorts };
  }, null);
}

// ── Администратор ───────────────────────────────────────────────────

export async function getAdminDashboard() {
  return safeQuery(async () => {
    const [coursesCount, cohortsCount, usersCount, certsCount] = await Promise.all([
      prisma.course.count(),
      prisma.cohort.count(),
      prisma.user.count(),
      prisma.certificate.count(),
    ]);

    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        modules: { select: { id: true } },
        instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { modules: true } },
      },
    });

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
      lessonsCount: 0,
      instructors: c.instructors.map((ci) => ({
        id: ci.user.id,
        name: ci.user.name ?? "",
        email: ci.user.email,
      })),
    }));

    const cohorts = await prisma.cohort.findMany({
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true } }, _count: { select: { enrollments: true } } },
    });
    const formattedCohorts: CohortSummary[] = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      courseTitle: c.course?.title ?? "",
      startsAt: c.startsAt?.toISOString().slice(0, 10) ?? null,
      endsAt: c.endsAt?.toISOString().slice(0, 10) ?? null,
      status: c.status,
      studentsCount: c._count.enrollments,
    }));

    const invites = await prisma.inviteLink.findMany({
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true } }, cohort: { select: { name: true } } },
    });
    const formattedInvites: InviteLinkSummary[] = invites.map((i) => ({
      id: i.id,
      token: i.token,
      courseTitle: i.course?.title,
      cohortName: i.cohort?.name,
      maxActivations: i.maxActivations,
      activationCount: i.activationCount,
      expiresAt: i.expiresAt?.toISOString().slice(0, 10) ?? null,
      status: i.status,
    }));

    const certificates = await prisma.certificate.findMany({
      orderBy: { issuedAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } }, course: { select: { title: true } } },
    });
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

    return { metrics, courses: formattedCourses, cohorts: formattedCohorts, invites: formattedInvites, certificates: formattedCerts };
  }, null);
}

// ── Преподаватель ───────────────────────────────────────────────────

export async function getInstructorDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const courses = await prisma.course.findMany({
      where: { instructors: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      include: {
        instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { modules: true } },
      },
    });

    const formattedCourses: CourseSummary[] = courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      durationHours: c.durationHours,
      status: c.status as CourseSummary["status"],
      traversalMode: c.traversalMode as "sequential" | "open",
      modulesCount: c._count.modules,
      lessonsCount: 0,
      instructors: c.instructors.map((ci) => ({
        id: ci.user.id,
        name: ci.user.name ?? "",
        email: ci.user.email,
      })),
    }));

    const courseIds = courses.map((c) => c.id);
    const studentsCount = await prisma.enrollment.count({
      where: { courseId: { in: courseIds }, status: "ACTIVE" }
    });

    const avgProgressResult = await prisma.courseProgress.aggregate({
      where: { courseId: { in: courseIds } },
      _avg: { percent: true }
    });
    const avgProgress = Math.round(avgProgressResult._avg.percent ?? 0);

    const metrics: DashboardMetric[] = [
      { label: "Мои курсы", value: courses.length, tone: "primary" },
      { label: "Слушатели", value: studentsCount, tone: "info" },
      { label: "Средний прогресс", value: `${avgProgress}%`, tone: avgProgress > 50 ? "success" : "warning" },
      { label: "Вопросы от кураторов", value: 0, tone: "success" },
    ];

    return { metrics, courses: formattedCourses };
  }, null);
}

// ── Заказчик ────────────────────────────────────────────────────────

export async function getCustomerObserverDashboard() {
  return safeQuery(async () => {
    const metrics: DashboardMetric[] = [
      { label: "Проекты", value: 1, tone: "primary" },
      { label: "Потоки", value: 0, tone: "info" },
      { label: "Прогресс", value: "0%", tone: "warning" },
      { label: "Сертификаты", value: 0, tone: "success" },
    ];

    return { metrics };
  }, null);
}
