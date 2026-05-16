import { describe, expect, it, vi } from "vitest";
import { getCompletionBasis } from "@/server/modules/progress/service";

const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockModuleFindUnique = vi.hoisted(() => vi.fn());
const mockLessonProgressCount = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockCertificateFindFirst = vi.hoisted(() => vi.fn());
const mockTxLessonProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxBlockFindUnique = vi.hoisted(() => vi.fn());
const mockTxLessonProgressCount = vi.hoisted(() => vi.fn());
const mockTxBlockProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxModuleProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxCourseProgressUpsert = vi.hoisted(() => vi.fn());

const mock$transaction = vi.hoisted(() => vi.fn(async (arg: unknown) => {
  if (typeof arg === "function") {
    return (arg as (tx: Record<string, unknown>) => unknown)({
      lessonProgress: { upsert: mockTxLessonProgressUpsert, count: mockTxLessonProgressCount },
      blockProgress: { upsert: mockTxBlockProgressUpsert },
      moduleProgress: { upsert: mockTxModuleProgressUpsert },
      courseProgress: { upsert: mockTxCourseProgressUpsert },
      block: { findUnique: mockTxBlockFindUnique },
    });
  }
  if (Array.isArray(arg)) {
    return Promise.all(arg);
  }
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
    enrollment: { findUnique: mockEnrollmentFindUnique },
    module: { findUnique: mockModuleFindUnique },
    lessonProgress: { count: mockLessonProgressCount },
    certificate: { findFirst: mockCertificateFindFirst },
    auditLog: { create: mockAuditLogCreate },
    $transaction: mock$transaction,
  }),
}));

const { markLessonProgress } = await import("@/server/modules/progress/service");

describe("markLessonProgress", () => {
  it("updates lesson progress and cascades to module and course", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      blockId: null,
      module: {
        id: "m1",
        order: 1,
        lessons: [{ id: "l1", isRequired: true, order: 1 }],
        course: {
          id: "c1",
          traversalMode: "open",
          modules: [
            {
              id: "m1",
              order: 1,
              lessons: [{ id: "l1", isRequired: true, order: 1 }],
            },
          ],
        },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    mockTxLessonProgressCount.mockResolvedValue(1);
    mockTxLessonProgressUpsert.mockResolvedValue({
      id: "lp1",
      percent: 100,
      status: "COMPLETED",
      userId: "u1",
      lessonId: "l1",
    });
    mockTxModuleProgressUpsert.mockResolvedValue({
      id: "mp1",
      percent: 100,
      status: "COMPLETED",
    });
    mockTxCourseProgressUpsert.mockResolvedValue({
      id: "cp1",
      percent: 100,
      status: "COMPLETED",
    });
    mockCertificateFindFirst.mockResolvedValue(null);
    mockModuleFindUnique.mockResolvedValue({ title: "Module 1" });

    const result = await markLessonProgress("u1", "l1", 100);
    expect(result.lessonProgress.percent).toBe(100);
    expect(result.lessonProgress.status).toBe("COMPLETED");
    expect(result.moduleProgress.status).toBe("COMPLETED");
    expect(result.courseProgress.status).toBe("COMPLETED");
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it("rejects progress for non-enrolled user", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      blockId: null,
      module: {
        id: "m1",
        order: 1,
        lessons: [],
        course: { id: "c1", traversalMode: "open", modules: [] },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue(null);

    await expect(markLessonProgress("u1", "l1", 50)).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("rejects progress for inactive enrollment", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      blockId: null,
      module: {
        id: "m1",
        order: 1,
        lessons: [],
        course: { id: "c1", traversalMode: "open", modules: [] },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "INACTIVE" });

    await expect(markLessonProgress("u1", "l1", 50)).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

describe("getCompletionBasis", () => {
  it("returns only required lessons when some are required", () => {
    const lessons = [
      { id: "l1", isRequired: true },
      { id: "l2", isRequired: false },
      { id: "l3", isRequired: true },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.isRequired)).toBe(true);
  });

  it("returns all lessons when none are required", () => {
    const lessons = [
      { id: "l1", isRequired: false },
      { id: "l2", isRequired: false },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    const result = getCompletionBasis([]);
    expect(result).toHaveLength(0);
  });

  it("handles null isRequired values", () => {
    const lessons = [
      { id: "l1", isRequired: null },
      { id: "l2", isRequired: true },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("l2");
  });
});
