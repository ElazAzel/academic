import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockLessonQuestionFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindMany = vi.hoisted(() => vi.fn());
const mockRiskFlagFindMany = vi.hoisted(() => vi.fn());
const mockCourseProgressFindMany = vi.hoisted(() => vi.fn());
const mockLessonProgressFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockMessageFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    curatorAssignment: { findMany: mockCuratorAssignmentFindMany },
    lessonQuestion: { findMany: mockLessonQuestionFindMany },
    assignmentSubmission: { findMany: mockAssignmentSubmissionFindMany },
    riskFlag: { findMany: mockRiskFlagFindMany },
    courseProgress: { findMany: mockCourseProgressFindMany },
    lessonProgress: { findMany: mockLessonProgressFindMany },
    enrollment: { findMany: mockEnrollmentFindMany },
    message: { findMany: mockMessageFindMany },
  },
}));

const { getCuratorDashboard } = await import("@/server/actions/dashboard/curator");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-17T00:00:00.000Z"));
  mockRequireRole.mockResolvedValue({ id: "cur1", roles: ["curator"] });
  mockGetCurrentUser.mockResolvedValue({ id: "cur1", email: "curator@example.com", roles: ["curator"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getCuratorDashboard", () => {
  it("builds scoped student operation cards with queues and next action", async () => {
    const student = { id: "student1", name: "Слушатель 1", email: "s1@example.com" };
    const course = { id: "course1", title: "AI Strategy" };
    const courseModule = { id: "module1", title: "Модуль 1", courseId: course.id };
    const lesson = { id: "lesson1", title: "Урок 1" };
    const createdAt = new Date("2026-05-16T12:00:00.000Z");

    mockCuratorAssignmentFindMany.mockResolvedValue([
      {
        id: "assignment1",
        studentId: student.id,
        assignedAt: createdAt,
        student: { ...student, lastLoginAt: new Date("2026-05-10T00:00:00.000Z") },
        cohort: {
          id: "cohort1",
          name: "Поток A",
          courseId: course.id,
          endsAt: new Date("2026-05-25T00:00:00.000Z"),
          course,
          deadlines: [
            { dueAt: new Date("2026-05-18T00:00:00.000Z"), module: { id: courseModule.id, title: courseModule.title } },
          ],
          blockDeadlines: [],
        },
      },
    ]);

    mockLessonQuestionFindMany.mockResolvedValue([
      {
        id: "question1",
        text: "Нужна помощь",
        studentId: student.id,
        student,
        lesson: {
          ...lesson,
          module: { title: courseModule.title, course },
          block: { title: "Блок 1" },
        },
        createdAt,
      },
    ]);

    mockAssignmentSubmissionFindMany.mockResolvedValue([
      {
        id: "submission1",
        userId: student.id,
        answerText: "Ответ",
        fileUrl: null,
        attemptNumber: 1,
        submittedAt: createdAt,
        status: "SUBMITTED",
        user: student,
        assignment: {
          title: "Практика",
          course,
          lesson: {
            ...lesson,
            module: { ...courseModule, course },
            block: { title: "Блок 1" },
          },
        },
      },
    ]);

    mockRiskFlagFindMany.mockResolvedValue([
      {
        id: "risk1",
        userId: student.id,
        type: "inactive_learning",
        severity: "high",
        status: "open",
        createdAt,
        user: student,
        course,
        cohort: { id: "cohort1", name: "Поток A", courseId: course.id, course },
      },
    ]);

    mockCourseProgressFindMany.mockResolvedValue([
      { userId: student.id, courseId: course.id, percent: 42, status: "IN_PROGRESS" },
    ]);

    mockLessonProgressFindMany.mockResolvedValue([
      {
        userId: student.id,
        updatedAt: createdAt,
        lesson: {
          ...lesson,
          module: courseModule,
          block: { title: "Блок 1" },
        },
      },
    ]);

    mockEnrollmentFindMany.mockResolvedValue([
      {
        userId: student.id,
        courseId: course.id,
        course,
        courseProgress: [{ percent: 42, status: "IN_PROGRESS" }],
      },
    ]);

    mockMessageFindMany.mockResolvedValue([
      {
        senderId: student.id,
        receiverId: "cur1",
        readAt: null,
        createdAt,
        lessonId: lesson.id,
        lesson,
      },
    ]);

    const data = await getCuratorDashboard();

    expect(data?.metrics[0]).toMatchObject({ label: "Мои слушатели", value: 1 });
    expect(data?.questions).toHaveLength(1);
    expect(data?.submissions).toHaveLength(1);
    expect(data?.risks).toHaveLength(1);
    expect(data?.students).toHaveLength(1);
    expect(data?.students[0]).toMatchObject({
      studentId: student.id,
      courseTitle: course.title,
      progressPercent: 42,
      openQuestions: 1,
      pendingAssignments: 1,
      activeRisks: 1,
      highestRiskSeverity: "high",
      unreadMessages: 1,
      nextAction: { kind: "risk" },
    });

    expect(mockAssignmentSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: [student.id] } }),
      }),
    );
    expect(mockRiskFlagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: [student.id] }, status: "open" }),
      }),
    );
  });
});
