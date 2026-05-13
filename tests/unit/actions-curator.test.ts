import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMarkLessonProgress = vi.hoisted(() => vi.fn());

const mockLessonQuestionFindUnique = vi.hoisted(() => vi.fn());
const mockLessonQuestionUpdate = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindUnique = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionUpdate = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindFirst = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/server/modules/audit/service", () => ({ logAudit: mockLogAudit }));
vi.mock("@/server/modules/notifications/service", () => ({ createNotification: mockCreateNotification }));
vi.mock("@/server/modules/progress/service", () => ({ markLessonProgress: mockMarkLessonProgress }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lessonQuestion: { findUnique: mockLessonQuestionFindUnique, update: mockLessonQuestionUpdate },
    assignmentSubmission: { findUnique: mockAssignmentSubmissionFindUnique, update: mockAssignmentSubmissionUpdate },
    curatorAssignment: { findFirst: mockCuratorAssignmentFindFirst },
    auditLog: { create: mockAuditLogCreate },
  }),
}));

const {
  answerQuestionAction, reviewSubmissionAction, forwardQuestionAction, answerForwardedQuestionAction,
} = await import("@/server/actions/curator");

const curatorUser = { id: "cur1", email: "cur@test.com", name: "Curator", roles: ["curator"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(curatorUser);
  mockCuratorAssignmentFindFirst.mockResolvedValue({ id: "ass1" });
});

describe("answerQuestionAction", () => {
  it("answers question successfully", async () => {
    mockLessonQuestionFindUnique.mockResolvedValue({ id: "q1", studentId: "u1", lessonId: "l1" });

    const result = await answerQuestionAction("q1", "Подробный ответ");
    expect(result).toEqual({ success: true });
    expect(mockLessonQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "q1" }, data: expect.objectContaining({ answer: "Подробный ответ", status: "ANSWERED" }) }),
    );
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "question.answered" }));
  });

  it("throws if answer is empty", async () => {
    await expect(answerQuestionAction("q1", "   ")).rejects.toThrow("Ответ не может быть пустым");
  });

  it("throws if question not found", async () => {
    mockLessonQuestionFindUnique.mockResolvedValue(null);
    await expect(answerQuestionAction("q1", "answer")).rejects.toThrow("Вопрос не найден");
  });

  it("throws if no access to student", async () => {
    mockLessonQuestionFindUnique.mockResolvedValue({ id: "q1", studentId: "u1", lessonId: "l1" });
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);
    await expect(answerQuestionAction("q1", "answer")).rejects.toThrow("Доступ запрещен");
  });
});

describe("reviewSubmissionAction", () => {
  it("reviews and accepts submission, marking progress", async () => {
    mockAssignmentSubmissionFindUnique.mockResolvedValue({
      id: "s1", userId: "u1",
      assignment: { lessonId: "l1" },
    });
    mockAssignmentSubmissionUpdate.mockResolvedValue({
      userId: "u1",
      assignment: { lessonId: "l1" },
    });

    const result = await reviewSubmissionAction("s1", { status: "ACCEPTED", score: 90 });
    expect(result).toEqual({ success: true });
    expect(mockMarkLessonProgress).toHaveBeenCalledWith("u1", "l1", 100);
  });

  it("throws if submission not found", async () => {
    mockAssignmentSubmissionFindUnique.mockResolvedValue(null);
    await expect(reviewSubmissionAction("s1", { status: "ACCEPTED", score: 90 })).rejects.toThrow("Запись не найдена");
  });

  it("throws if no access to student", async () => {
    mockAssignmentSubmissionFindUnique.mockResolvedValue({
      id: "s1", userId: "u1",
      assignment: { lessonId: "l1" },
    });
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);
    await expect(reviewSubmissionAction("s1", { status: "ACCEPTED", score: 90 })).rejects.toThrow("Доступ запрещен");
  });

  it("handles rejection without marking progress", async () => {
    mockAssignmentSubmissionFindUnique.mockResolvedValue({
      id: "s1", userId: "u1",
      assignment: { lessonId: "l1" },
    });
    mockAssignmentSubmissionUpdate.mockResolvedValue({ userId: "u1", assignment: { lessonId: "l1" } });

    await reviewSubmissionAction("s1", { status: "REJECTED", score: 40, feedback: "Try again" });
    expect(mockMarkLessonProgress).not.toHaveBeenCalled();
  });
});

describe("forwardQuestionAction", () => {
  it("forwards question to instructor", async () => {
    mockLessonQuestionFindUnique.mockResolvedValue({
      id: "q1", studentId: "u1", lessonId: "l1", curatorId: "cur1",
      student: { name: "Student" },
    });

    const result = await forwardQuestionAction("q1");
    expect(result).toEqual({ success: true });
    expect(mockLessonQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "q1" }, data: { status: "FORWARDED" } }),
    );
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
  });

  it("throws if question not found", async () => {
    mockLessonQuestionFindUnique.mockResolvedValue(null);
    await expect(forwardQuestionAction("q1")).rejects.toThrow("Вопрос не найден");
  });
});

describe("answerForwardedQuestionAction", () => {
  const instructorUser = { id: "inst1", email: "inst@test.com", name: "Instructor", roles: ["instructor"] };

  it("instructor answers forwarded question", async () => {
    mockRequireRole.mockResolvedValue(instructorUser);
    mockLessonQuestionFindUnique.mockResolvedValue({
      id: "q1", studentId: "u1", status: "FORWARDED", curatorId: "cur1",
      student: { name: "Student", email: "s@test.com" },
      lesson: { module: { course: { instructors: [{ userId: "inst1" }] } } },
    });

    const fd = new FormData();
    fd.set("questionId", "q1"); fd.set("answer", "Answer from instructor");

    await answerForwardedQuestionAction(fd);
    expect(mockLessonQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ answer: "Answer from instructor", status: "ANSWERED" }) }),
    );
  });

  it("throws if not instructor of course", async () => {
    mockRequireRole.mockResolvedValue(instructorUser);
    mockLessonQuestionFindUnique.mockResolvedValue({
      id: "q1", studentId: "u1", status: "FORWARDED", curatorId: "cur1",
      student: { name: "Student", email: "s@test.com" },
      lesson: { module: { course: { instructors: [{ userId: "other" }] } } },
    });

    const fd = new FormData();
    fd.set("questionId", "q1"); fd.set("answer", "Answer");
    await expect(answerForwardedQuestionAction(fd)).rejects.toThrow("Доступ запрещен");
  });

  it("throws if question not in FORWARDED status", async () => {
    mockRequireRole.mockResolvedValue(instructorUser);
    mockLessonQuestionFindUnique.mockResolvedValue({
      id: "q1", studentId: "u1", status: "OPEN", curatorId: "cur1",
      student: { name: "Student", email: "s@test.com" },
      lesson: { module: { course: { instructors: [{ userId: "inst1" }] } } },
    });

    const fd = new FormData();
    fd.set("questionId", "q1"); fd.set("answer", "Answer");
    await expect(answerForwardedQuestionAction(fd)).rejects.toThrow("не был переадресован");
  });
});
