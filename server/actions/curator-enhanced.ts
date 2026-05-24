"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getStudentAnalyticsDetail } from "@/server/actions/dashboard/shared";
import { QuestionStatus } from "@prisma/client";
import { maskStudentName } from "@/lib/utils";

const prisma = getPrisma();

export async function getCuratorEnhancedStudents() {
  try {
    await requireRole(["curator", "super_curator", "admin"]);
    const actor = await getCurrentUser();
    if (!actor) return [];

    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: actor.id, active: true },
      include: {
        student: {
          select: {
            id: true, name: true, email: true, lastLoginAt: true,
          },
        },
        cohort: { select: { id: true, name: true } },
      },
    });

    const studentIds = assignments.map((a) => a.studentId);

    const [progressData, riskData, answeredQuestions, chatMsgs] = await Promise.all([
      prisma.courseProgress.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, percent: true, status: true },
      }),
      prisma.riskFlag.findMany({
        where: { userId: { in: studentIds }, resolvedAt: null },
        select: { userId: true, severity: true },
      }),
      prisma.lessonQuestion.findMany({
        where: { curatorId: actor.id, answeredAt: { not: null } },
        select: { studentId: true, createdAt: true, answeredAt: true },
      }),
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: { in: studentIds }, receiverId: actor.id },
            { senderId: actor.id, receiverId: { in: studentIds } },
          ],
        },
        select: { senderId: true, receiverId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),
    ]);

    const progressMap = new Map(progressData.map((p) => [p.userId, p]));
    const riskMap = new Map<string, { count: number; hasCritical: boolean }>();
    for (const r of riskData) {
      const cur = riskMap.get(r.userId) ?? { count: 0, hasCritical: false };
      cur.count++;
      if (r.severity === "critical" || r.severity === "high") cur.hasCritical = true;
      riskMap.set(r.userId, cur);
    }

    const questionResponseMap = new Map<string, { total: number; count: number }>();
    for (const q of answeredQuestions) {
      if (!q.answeredAt) continue;
      const hours = (q.answeredAt.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60);
      const prev = questionResponseMap.get(q.studentId) ?? { total: 0, count: 0 };
      prev.total += hours;
      prev.count++;
      questionResponseMap.set(q.studentId, prev);
    }

    const chatResponseMap = new Map<string, { total: number; count: number }>();
    const chatByStudent = new Map<string, typeof chatMsgs>();
    for (const msg of chatMsgs) {
      const otherId = msg.senderId === actor.id ? (msg.receiverId ?? "") : msg.senderId;
      if (!otherId || !studentIds.includes(otherId)) continue;
      const list = chatByStudent.get(otherId) ?? [];
      list.push(msg);
      chatByStudent.set(otherId, list);
    }
    for (const [sid, msgs] of chatByStudent) {
      let total = 0;
      let count = 0;
      for (let i = 0; i < msgs.length - 1; i++) {
        const cur = msgs[i];
        const next = msgs[i + 1];
        const isStudentThenCurator = cur.senderId === sid && next.senderId === actor.id;
        if (!isStudentThenCurator) continue;
        total += (next.createdAt.getTime() - cur.createdAt.getTime()) / (1000 * 60 * 60);
        count++;
      }
      if (count > 0) chatResponseMap.set(sid, { total, count });
    }

    return assignments.map((a) => {
      const progress = progressMap.get(a.studentId);
      const risk = riskMap.get(a.studentId);
      const lastLogin = a.student.lastLoginAt?.toISOString() ?? null;
      const daysSinceLogin = lastLogin
        ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const qResp = questionResponseMap.get(a.studentId);
      const cResp = chatResponseMap.get(a.studentId);

      return {
        id: a.student.id,
        name: actor.roles.includes("admin") ? (a.student.name ?? a.student.email) : maskStudentName(a.student.id),
        email: a.student.email,
        cohortName: a.cohort?.name ?? null,
        progress: progress?.percent ?? 0,
        progressStatus: progress?.status ?? "NOT_STARTED",
        lastLoginAt: lastLogin,
        daysSinceLogin,
        riskCount: risk?.count ?? 0,
        hasCriticalRisk: risk?.hasCritical ?? false,
        avgResponseHours: qResp ? Math.round((qResp.total / qResp.count) * 10) / 10 : 0,
        avgChatResponseHours: cResp ? Math.round((cResp.total / cResp.count) * 10) / 10 : 0,
      };
    });
  } catch (error) {
    console.error("[getCuratorEnhancedStudents]", error);
    throw error;
  }
}

export async function getCuratorEnhancedRisks() {
  try {
    await requireRole(["curator", "super_curator", "admin"]);
    const actor = await getCurrentUser();
    if (!actor) return [];

    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: actor.id, active: true },
      select: { studentId: true },
    });
    const studentIds = assignments.map((a) => a.studentId);

    const riskFlags = await prisma.riskFlag.findMany({
      where: { userId: { in: studentIds }, resolvedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
        course: { select: { title: true } },
        cohort: { select: { name: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    const [progressData, questionData, assignmentData] = await Promise.all([
      prisma.courseProgress.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, percent: true, status: true },
      }),
      prisma.lessonQuestion.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true, studentId: true, status: true },
      }),
      prisma.assignmentSubmission.findMany({
        where: { userId: { in: studentIds } },
        select: { id: true, userId: true, status: true },
      }),
    ]);

    const progressMap = new Map(progressData.map((p) => [p.userId, p]));
    const questionMap = new Map<string, typeof questionData>();
    const assignmentMap = new Map<string, typeof assignmentData>();
    for (const q of questionData) {
      const arr = questionMap.get(q.studentId) ?? [];
      arr.push(q);
      questionMap.set(q.studentId, arr);
    }
    for (const a of assignmentData) {
      const arr = assignmentMap.get(a.userId) ?? [];
      arr.push(a);
      assignmentMap.set(a.userId, arr);
    }

    return riskFlags.map((r) => {
      const progress = progressMap.get(r.userId);
      const questions = r.userId ? questionMap.get(r.userId) ?? [] : [];
      const assignments = r.userId ? assignmentMap.get(r.userId) ?? [] : [];
      const daysSinceLogin = r.user.lastLoginAt
        ? Math.floor((Date.now() - r.user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: r.id,
        type: r.type,
        severity: r.severity,
        studentId: r.userId,
        studentName: actor.roles.includes("admin") ? (r.user.name ?? r.user.email) : maskStudentName(r.user.id),
        studentEmail: r.user.email,
        courseTitle: r.course?.title ?? "",
        cohortName: r.cohort?.name ?? null,
        createdAt: r.createdAt.toISOString(),
        progressPercent: progress?.percent ?? 0,
        progressStatus: progress?.status ?? "NOT_STARTED",
        openQuestions: questions.filter((q) => q.status === QuestionStatus.OPEN).length,
        pendingAssignments: assignments.filter((s) => s.status === "SUBMITTED" || s.status === "IN_REVIEW").length,
        lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
        daysSinceLogin,
      };
    });
  } catch (error) {
    console.error("[getCuratorEnhancedRisks]", error);
    throw error;
  }
}

export async function getCuratorReportData() {
  try {
    await requireRole(["curator", "super_curator", "admin"]);
    const actor = await getCurrentUser();
    if (!actor) return null;

    const students = await getStudentAnalyticsDetail(
      (await prisma.curatorAssignment.findMany({
        where: { curatorId: actor.id, active: true },
        select: { studentId: true },
      })).map((a) => a.studentId),
    );

    const total = students.length;
    const completed = students.filter((s) => s.progressStatus === "COMPLETED").length;
    const inProgress = students.filter((s) => s.progressStatus === "IN_PROGRESS").length;
    const notStarted = students.filter((s) => s.progressStatus === "NOT_STARTED").length;
    const blocked = students.filter((s) => s.progressStatus === "BLOCKED").length;
    const withRisks = students.filter((s) => s.riskCount > 0).length;
    const avgProgress = total > 0 ? Math.round(students.reduce((s, c) => s + c.coursePercent, 0) / total) : 0;

    const courseBreakdown: Record<string, { total: number; completed: number; avg: number }> = {};
    for (const s of students) {
      if (!courseBreakdown[s.courseTitle]) courseBreakdown[s.courseTitle] = { total: 0, completed: 0, avg: 0 };
      courseBreakdown[s.courseTitle].total++;
      courseBreakdown[s.courseTitle].avg += s.coursePercent;
      if (s.progressStatus === "COMPLETED") courseBreakdown[s.courseTitle].completed++;
    }
    for (const key of Object.keys(courseBreakdown)) {
      const c = courseBreakdown[key];
      c.avg = Math.round(c.avg / c.total);
    }

    return {
      total,
      completed,
      inProgress,
      notStarted,
      blocked,
      withRisks,
      avgProgress,
      courseBreakdown: Object.entries(courseBreakdown).map(([course, data]) => ({ course, ...data })),
      studentList: students,
    };
  } catch (error) {
    console.error("[getCuratorReportData]", error);
    throw error;
  }
}
