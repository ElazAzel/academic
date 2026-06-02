import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockCourseFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentCount = vi.hoisted(() => vi.fn());
const mockCourseProgressAggregate = vi.hoisted(() => vi.fn());
const mockCourseProgressCount = vi.hoisted(() => vi.fn());
const mockQuizAttemptAggregate = vi.hoisted(() => vi.fn());
const mockLessonRatingAggregate = vi.hoisted(() => vi.fn());
const mockModuleProgressGroupBy = vi.hoisted(() => vi.fn());
const mockQuizFindMany = vi.hoisted(() => vi.fn());
const mockQuizAttemptGroupBy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: { findMany: mockCourseFindMany },
    enrollment: { count: mockEnrollmentCount },
    courseProgress: {
      aggregate: mockCourseProgressAggregate,
      count: mockCourseProgressCount,
    },
    quizAttempt: {
      aggregate: mockQuizAttemptAggregate,
      groupBy: mockQuizAttemptGroupBy,
    },
    lessonRating: { aggregate: mockLessonRatingAggregate },
    moduleProgress: { groupBy: mockModuleProgressGroupBy },
    quiz: { findMany: mockQuizFindMany },
  },
}));

const { getInstructorAnalytics } = await import("@/server/actions/dashboard/instructor");

describe("getInstructorAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockGetCurrentUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockCourseFindMany.mockResolvedValue([
      {
        id: "course-1",
        title: "Course",
        modules: [{ id: "module-1", title: "Module", _count: { lessons: 2 } }],
        _count: { enrollments: 2 },
      },
    ]);
    mockEnrollmentCount.mockResolvedValue(2);
    mockCourseProgressAggregate.mockResolvedValue({ _avg: { percent: 50 } });
    mockCourseProgressCount.mockResolvedValue(1);
    mockQuizAttemptAggregate.mockResolvedValue({ _avg: { score: 75 } });
    mockLessonRatingAggregate.mockResolvedValue({ _avg: { score: 4 }, _count: { _all: 3 } });
    mockModuleProgressGroupBy.mockResolvedValue([]);
    mockQuizFindMany.mockResolvedValue([{ id: "quiz-1", title: "Quiz" }]);
    mockQuizAttemptGroupBy.mockResolvedValue([]);
  });

  it("uses course-level and lesson-level quiz scope for instructor analytics", async () => {
    await getInstructorAnalytics();

    const expectedQuizScope = {
      OR: [
        { courseId: { in: ["course-1"] } },
        { lesson: { module: { courseId: { in: ["course-1"] } } } },
      ],
    };

    expect(mockQuizAttemptAggregate).toHaveBeenCalledWith({
      where: { quiz: expectedQuizScope },
      _avg: { score: true },
    });
    expect(mockQuizFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedQuizScope,
      }),
    );
  });
});
