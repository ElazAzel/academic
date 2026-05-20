import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockLessonQuestionFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindMany = vi.hoisted(() => vi.fn());
const mockRiskFlagFindMany = vi.hoisted(() => vi.fn());
const mockCourseProgressFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockMessageFindMany = vi.hoisted(() => vi.fn());
const mockMessageGroupBy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    curatorAssignment: { findMany: mockCuratorAssignmentFindMany },
    lessonQuestion: { findMany: mockLessonQuestionFindMany },
    assignmentSubmission: { findMany: mockAssignmentSubmissionFindMany },
    riskFlag: { findMany: mockRiskFlagFindMany },
    courseProgress: { findMany: mockCourseProgressFindMany },
    enrollment: { findMany: mockEnrollmentFindMany },
    message: { findMany: mockMessageFindMany, groupBy: mockMessageGroupBy },
  },
}));

const { getSuperCuratorDashboard } = await import("@/server/actions/dashboard/super-curator");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-17T12:00:00.000Z"));
  mockRequireRole.mockResolvedValue({ id: "sc1", roles: ["super_curator"] });
  mockGetCurrentUser.mockResolvedValue({ id: "sc1", email: "super@example.com", roles: ["super_curator"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getSuperCuratorDashboard", () => {
  it("builds scoped workload, cohort, question, and risk queues", async () => {
    const createdAt = new Date("2026-05-16T12:00:00.000Z");
    const course = { id: "course1", title: "AI Strategy" };
    const cohort = { id: "cohort1", name: "Поток A", courseId: course.id, status: "active", startsAt: null, endsAt: null, course };
    const curator = { id: "cur1", name: "Куратор Мадина", email: "curator@example.com", lastLoginAt: new Date("2026-05-17T11:59:00.000Z") };
    const student = { id: "student1", name: "Слушатель 1", email: "student@example.com" };

    mockCuratorAssignmentFindMany.mockResolvedValue([
      { studentId: student.id, curatorId: curator.id, assignedAt: createdAt, curator, student, cohort },
    ]);
    mockLessonQuestionFindMany
      .mockResolvedValueOnce([
        {
          id: "q1",
          text: "Нужна помощь",
          status: "OPEN",
          studentId: student.id,
          student,
          curator,
          curatorId: curator.id,
          lesson: {
            title: "Урок 1",
            module: { title: "Модуль 1", courseId: course.id, course },
          },
          createdAt,
        },
      ])
      .mockResolvedValueOnce([
        { curatorId: curator.id, createdAt: new Date("2026-05-15T10:00:00.000Z"), answeredAt: new Date("2026-05-15T12:00:00.000Z") },
      ]);
    mockAssignmentSubmissionFindMany.mockResolvedValue([
      {
        userId: student.id,
        user: student,
        assignment: {
          title: "Практика",
          courseId: course.id,
          course,
          lesson: null,
        },
      },
    ]);
    mockRiskFlagFindMany.mockResolvedValue([
      {
        id: "risk1",
        userId: student.id,
        courseId: course.id,
        cohortId: cohort.id,
        type: "inactive_learning",
        severity: "critical",
        user: student,
        course,
        cohort,
        createdAt,
      },
    ]);
    mockCourseProgressFindMany.mockResolvedValue([{ userId: student.id, courseId: course.id, percent: 25, status: "IN_PROGRESS" }]);
    mockEnrollmentFindMany.mockResolvedValue([{ userId: student.id, cohortId: cohort.id }]);
    mockMessageFindMany.mockResolvedValue([{ senderId: student.id, receiverId: curator.id }]);
    mockMessageGroupBy.mockResolvedValue([{ senderId: curator.id, _count: { _all: 4 } }]);

    const data = await getSuperCuratorDashboard();

    expect(mockCuratorAssignmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { superCuratorId: "sc1", active: true },
    }));
    expect(data?.curatorLoads).toHaveLength(1);
    expect(data?.curatorLoads[0]).toMatchObject({
      curatorId: curator.id,
      openQuestions: 1,
      pendingReviews: 1,
      activeRisks: 1,
      criticalRisks: 1,
      unreadMessages: 1,
      workloadLevel: "critical",
      nextActionLabel: "Разобрать риски",
    });
    expect(data?.cohortOperations[0]).toMatchObject({
      cohortId: cohort.id,
      avgProgress: 25,
      activeRisks: 1,
      criticalRisks: 1,
    });
    expect(data?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Слушателей", detail: "0 без куратора" }),
        expect.objectContaining({ label: "Высоких рисков", priority: "critical" }),
      ]),
    );
    expect(data?.problemQuestions[0]).toMatchObject({ id: "q1", curatorName: curator.name });
    expect(data?.riskQueue[0]).toMatchObject({ id: "risk1", severity: "critical" });
  });
});
