import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockDiscussionPostFindUnique = vi.hoisted(() => vi.fn());
const mockDiscussionPostDelete = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockGetCourseForStudent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
    discussionPost: {
      findUnique: mockDiscussionPostFindUnique,
      delete: mockDiscussionPostDelete,
    },
    user: { findUnique: mockUserFindUnique },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
  }),
}));

vi.mock("@/server/modules/learning/service", () => ({
  getCourseForStudent: mockGetCourseForStudent,
}));

const { deleteDiscussionPost } = await import("@/server/modules/discussion/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockLessonFindUnique.mockResolvedValue({
    id: "lesson-1",
    module: { courseId: "course-1" },
  });
  mockGetCourseForStudent.mockResolvedValue({ id: "course-1" });
  mockDiscussionPostDelete.mockResolvedValue({});
});

describe("discussion service", () => {
  it("does not delete a post from another lesson even when the actor owns it", async () => {
    mockDiscussionPostFindUnique.mockResolvedValue({
      userId: "student-1",
      discussion: {
        lessonId: "lesson-2",
        lesson: { module: { courseId: "course-1" } },
      },
    });

    await expect(deleteDiscussionPost("student-1", "lesson-1", "post-1")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });

    expect(mockDiscussionPostDelete).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("deletes the author's own post only when it belongs to the requested lesson", async () => {
    mockDiscussionPostFindUnique.mockResolvedValue({
      userId: "student-1",
      discussion: {
        lessonId: "lesson-1",
        lesson: { module: { courseId: "course-1" } },
      },
    });

    await expect(deleteDiscussionPost("student-1", "lesson-1", "post-1")).resolves.toBeUndefined();

    expect(mockDiscussionPostDelete).toHaveBeenCalledWith({ where: { id: "post-1" } });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });
});
