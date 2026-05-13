"use server";

import { safeQuery, getStudentAnalyticsDetail } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import type {
  QuestionFromStudent,
  SubmissionForReview,
  RiskItem,
  DashboardMetric,
  StudentAnalyticsDetail,
} from "@/types/domain";

export interface CuratorStudentItem {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  risk: boolean;
}

export async function getCuratorDashboard() {
  await requireRole(["curator"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      select: { studentId: true, cohort: { select: { id: true, name: true, courseId: true, course: { select: { title: true } } } } },
    });
    const studentIds = assignments.map((a) => a.studentId);

    const [questions, submissions, risks] = await Promise.all([
      prisma.lessonQuestion.findMany({
        where: { curatorId: user.id, status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { name: true, email: true } },
          lesson: { include: { module: { include: { course: true } } } },
        },
      }),
      prisma.assignmentSubmission.findMany({
        where: { userId: { in: studentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        orderBy: { submittedAt: "desc" },
        include: {
          assignment: { include: { course: true, lesson: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.riskFlag.findMany({
        where: { userId: { in: studentIds }, status: "open" },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
          cohort: { select: { name: true } },
        },
      }),
    ]);

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

export async function getCuratorStudents() {
  await requireRole(["curator", "super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      include: {
        student: {
          include: {
            enrollments: {
              include: {
                course: { select: { title: true } },
                courseProgress: true
              }
            },
            riskFlags: {
              where: { resolvedAt: null },
              take: 1
            }
          }
        }
      }
    });

    return assignments.map((a) => {
      const enrollment = a.student.enrollments[0];
      return {
        id: a.student.id,
        name: a.student.name ?? a.student.email,
        email: a.student.email,
        course: enrollment?.course?.title ?? "Не зачислен",
        progress: enrollment?.courseProgress[0]?.percent ?? 0,
        risk: a.student.riskFlags.length > 0
      };
    });
  }, []);
}

export async function getCuratorQuestions(status: "OPEN" | "ANSWERED" = "OPEN") {
  await requireRole(["curator", "super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const questions = await prisma.lessonQuestion.findMany({
      where: { curatorId: user.id, status },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: q.student.name ?? q.student.email,
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: (q.status === "ANSWERED" ? "answered" : "open") as "open" | "answered",
      createdAt: q.createdAt.toISOString(),
      answer: q.answer,
      answeredAt: q.answeredAt?.toISOString(),
    }));
  }, []);
}

export async function getCuratorStudentAnalytics(): Promise<StudentAnalyticsDetail[]> {
  await requireRole(["curator"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      select: { studentId: true },
    });
    const studentIds = assignments.map((a) => a.studentId);
    return getStudentAnalyticsDetail(studentIds);
  }, []);
}
