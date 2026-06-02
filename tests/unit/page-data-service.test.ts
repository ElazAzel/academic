import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentFindFirst = vi.hoisted(() => vi.fn());
const mockQuizFindMany = vi.hoisted(() => vi.fn());
const mockQuizFindFirst = vi.hoisted(() => vi.fn());
const mockCourseFindMany = vi.hoisted(() => vi.fn());
const mockLessonQuestionCount = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionCount = vi.hoisted(() => vi.fn());
const mockQuizAttemptCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    assignment: {
      findMany: mockAssignmentFindMany,
      findFirst: mockAssignmentFindFirst,
    },
    quiz: {
      findMany: mockQuizFindMany,
      findFirst: mockQuizFindFirst,
    },
    course: {
      findMany: mockCourseFindMany,
    },
    lessonQuestion: {
      count: mockLessonQuestionCount,
    },
    assignmentSubmission: {
      count: mockAssignmentSubmissionCount,
    },
    quizAttempt: {
      count: mockQuizAttemptCount,
    },
  }),
}));

const {
  getInstructorAssignmentEditData,
  getInstructorAssignmentsPageData,
  getInstructorQuizEditData,
  getInstructorQuizzesPageData,
  getInstructorReportsPageData,
} = await import("@/server/modules/page-data/service");

const instructorAssignmentAccessWhere = {
  OR: [
    { course: { instructors: { some: { userId: "instructor-1" } } } },
    { lesson: { module: { course: { instructors: { some: { userId: "instructor-1" } } } } } },
  ],
};

const instructorQuizAccessWhere = {
  OR: [
    { course: { instructors: { some: { userId: "instructor-1" } } } },
    { lesson: { module: { course: { instructors: { some: { userId: "instructor-1" } } } } } },
  ],
};

describe("instructor page data scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignmentFindMany.mockResolvedValue([]);
    mockAssignmentFindFirst.mockResolvedValue(null);
    mockQuizFindMany.mockResolvedValue([]);
    mockQuizFindFirst.mockResolvedValue(null);
    mockCourseFindMany.mockResolvedValue([]);
    mockLessonQuestionCount.mockResolvedValue(0);
    mockAssignmentSubmissionCount.mockResolvedValue(0);
    mockQuizAttemptCount.mockResolvedValue(0);
  });

  it("lists course-level and lesson-level assignments owned by instructor", async () => {
    await getInstructorAssignmentsPageData("instructor-1", ["instructor"]);

    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: instructorAssignmentAccessWhere,
        include: expect.objectContaining({
          lesson: { include: { module: { select: { courseId: true, course: { select: { id: true, title: true } } } } } },
        }),
      }),
    );
  });

  it("does not load foreign assignment edit data by id alone", async () => {
    await getInstructorAssignmentEditData("assignment-1", "instructor-1", ["instructor"]);

    expect(mockAssignmentFindFirst).toHaveBeenCalledWith({
      where: {
        id: "assignment-1",
        ...instructorAssignmentAccessWhere,
      },
    });
  });

  it("lets admins load assignment edit data without instructor ownership filter", async () => {
    await getInstructorAssignmentEditData("assignment-1", "admin-1", ["admin"]);

    expect(mockAssignmentFindFirst).toHaveBeenCalledWith({
      where: { id: "assignment-1" },
    });
  });

  it("lists course-level and lesson-level quizzes owned by instructor", async () => {
    await getInstructorQuizzesPageData("instructor-1", ["instructor"]);

    expect(mockQuizFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: instructorQuizAccessWhere,
        include: expect.objectContaining({
          lesson: { include: { module: { select: { courseId: true, course: { select: { id: true, title: true } } } } } },
        }),
      }),
    );
  });

  it("loads lesson-level quiz edit data through the owning course", async () => {
    await getInstructorQuizEditData("quiz-1", "instructor-1", ["instructor"]);

    expect(mockQuizFindFirst).toHaveBeenCalledWith({
      where: {
        id: "quiz-1",
        ...instructorQuizAccessWhere,
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        course: { select: { id: true } },
        lesson: { select: { module: { select: { courseId: true } } } },
      },
    });
  });

  it("counts instructor report quiz attempts across course-level and lesson-level quizzes", async () => {
    mockCourseFindMany.mockResolvedValue([
      {
        id: "course-1",
        title: "Course",
        _count: { enrollments: 3 },
        courseProgress: [],
      },
    ]);

    await getInstructorReportsPageData("instructor-1");

    expect(mockQuizAttemptCount).toHaveBeenNthCalledWith(1, {
      where: {
        quiz: {
          OR: [
            { courseId: { in: ["course-1"] } },
            { lesson: { module: { courseId: { in: ["course-1"] } } } },
          ],
        },
      },
    });
    expect(mockQuizAttemptCount).toHaveBeenNthCalledWith(2, {
      where: {
        quiz: {
          OR: [
            { courseId: { in: ["course-1"] } },
            { lesson: { module: { courseId: { in: ["course-1"] } } } },
          ],
        },
        passed: true,
      },
    });
  });
});
