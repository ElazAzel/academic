import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockLessonMediaCreate = vi.hoisted(() => vi.fn());
const mockLessonMediaFindUnique = vi.hoisted(() => vi.fn());
const mockLessonMediaDelete = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    lessonMedia: {
      create: mockLessonMediaCreate,
      findUnique: mockLessonMediaFindUnique,
      delete: mockLessonMediaDelete,
    },
  }),
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: mockLogAudit,
}));

const { uploadLessonMediaAction, deleteLessonMediaAction } = await import("@/server/actions/files");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
  mockLessonFindUnique.mockResolvedValue({ module: { courseId: "course-1" } });
  mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1" });
  mockLessonMediaCreate.mockResolvedValue({ id: "media-1" });
  mockLessonMediaFindUnique.mockResolvedValue({
    id: "media-1",
    lessonId: "lesson-1",
    lesson: { module: { courseId: "course-1" } },
  });
  mockLessonMediaDelete.mockResolvedValue({});
  mockLogAudit.mockResolvedValue({ id: "audit-1" });
});

describe("lesson media file actions", () => {
  it("stores the managed storage key from the upload ticket", async () => {
    const result = await uploadLessonMediaAction(
      "lesson-1",
      "file",
      "https://storage.example/public/course-builder/1710000000000-abcdef12.pdf",
      "guide.pdf",
      "course-builder/1710000000000-abcdef12.pdf",
    );

    expect(result).toEqual({ id: "media-1" });
    expect(mockRequireRole).toHaveBeenCalledWith(["admin", "instructor"]);
    expect(mockLessonFindUnique).toHaveBeenCalledWith({
      where: { id: "lesson-1" },
      select: { module: { select: { courseId: true } } },
    });
    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-1", userId: "instructor-1" } },
      select: { courseId: true },
    });
    expect(mockLessonMediaCreate).toHaveBeenCalledWith({
      data: {
        lessonId: "lesson-1",
        type: "file",
        url: "https://storage.example/public/course-builder/1710000000000-abcdef12.pdf",
        filename: "guide.pdf",
        storageKey: "course-builder/1710000000000-abcdef12.pdf",
      },
    });
  });

  it("keeps legacy external lesson media without a synthetic storage key", async () => {
    await uploadLessonMediaAction("lesson-1", "file", "https://cdn.example.com/guide.pdf", "guide.pdf");

    expect(mockLessonMediaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        url: "https://cdn.example.com/guide.pdf",
        storageKey: undefined,
      }),
    });
  });

  it("rejects submission storage keys for lesson media", async () => {
    await expect(
      uploadLessonMediaAction(
        "lesson-1",
        "file",
        "https://storage.example/public/submissions/1710000000000-abcdef12.pdf",
        "submission.pdf",
        "submissions/1710000000000-abcdef12.pdf",
      ),
    ).rejects.toMatchObject({ code: "validation_error", status: 422 });

    expect(mockLessonMediaCreate).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("blocks upload to lessons outside instructor courses", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    await expect(
      uploadLessonMediaAction(
        "lesson-foreign",
        "file",
        "https://storage.example/public/course-builder/1710000000000-abcdef12.pdf",
        "guide.pdf",
        "course-builder/1710000000000-abcdef12.pdf",
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(mockLessonMediaCreate).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("deletes lesson media through instructor/admin roles", async () => {
    const result = await deleteLessonMediaAction("media-1");

    expect(result).toEqual({ success: true });
    expect(mockLessonMediaFindUnique).toHaveBeenCalledWith({
      where: { id: "media-1" },
      select: {
        id: true,
        lessonId: true,
        lesson: { select: { module: { select: { courseId: true } } } },
      },
    });
    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-1", userId: "instructor-1" } },
      select: { courseId: true },
    });
    expect(mockLessonMediaDelete).toHaveBeenCalledWith({ where: { id: "media-1" } });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { lessonId: "lesson-1", courseId: "course-1" },
    }));
  });

  it("does not delete lesson media outside instructor courses", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    const result = await deleteLessonMediaAction("media-foreign");

    expect(result).toMatchObject({ success: false });
    expect(mockLessonMediaDelete).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
