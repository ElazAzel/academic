import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────

const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockQuizAttemptFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentSubFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentSubFindFirst = vi.hoisted(() => vi.fn());
const mockCourseProgressFindUnique = vi.hoisted(() => vi.fn());
const mockCohortFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindFirst = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockCuratorAssignFindFirst = vi.hoisted(() => vi.fn());
const mockObserverScope = vi.hoisted(() => vi.fn());
const mockScopedStudentIds = vi.hoisted(() => vi.fn());
const mockSuperCuratorScope = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: { findUnique: mockCourseFindUnique },
    quizAttempt: { findMany: mockQuizAttemptFindMany },
    assignmentSubmission: {
      findMany: mockAssignmentSubFindMany,
      findFirst: mockAssignmentSubFindFirst,
    },
    courseProgress: { findUnique: mockCourseProgressFindUnique },
    cohort: { findUnique: mockCohortFindUnique },
    enrollment: {
      findMany: mockEnrollmentFindMany,
      findFirst: mockEnrollmentFindFirst,
    },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    curatorAssignment: { findFirst: mockCuratorAssignFindFirst },
  }),
}));

vi.mock("@/server/modules/observer/scope", () => ({
  getObserverScope: mockObserverScope,
  getScopedStudentIdsForObserver: mockScopedStudentIds,
}));

vi.mock("@/server/modules/super-curator/scope", () => ({
  getSuperCuratorScope: mockSuperCuratorScope,
}));

const { getProductivityScore, getCohortProductivity } = await import(
  "@/server/modules/productivity-score"
);

// ── Test data helpers ─────────────────────────────────────────────────

const DEFAULT_COURSE = { id: "course-1", finalAssignmentId: "final-assign-1" };

function makeActor(roles: string[] = ["student"], id = "user-1") {
  return { id, email: "test@test.com", roles: roles as never };
}

function makeQuizAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "attempt-1",
    quizId: "quiz-1",
    userId: "user-1",
    score: 80,
    passed: true,
    submittedAt: new Date("2026-06-01"),
    quiz: {
      questions: [
        { id: "qq-1", points: 10 },
        { id: "qq-2", points: 10 },
      ],
    },
    ...overrides,
  };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    assignmentId: "assign-1",
    userId: "user-1",
    status: "ACCEPTED",
    score: 85,
    assignment: { maxScore: 100 },
    ...overrides,
  };
}

function makeCourseProgress(overrides: Record<string, unknown> = {}) {
  return {
    percent: 75,
    status: "IN_PROGRESS",
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCourseFindUnique.mockResolvedValue(DEFAULT_COURSE);
  mockObserverScope.mockResolvedValue({ projectIds: [], cohortIds: [] });
  mockScopedStudentIds.mockResolvedValue([]);
  mockSuperCuratorScope.mockResolvedValue({
    isGlobal: false,
    assignments: [],
    studentIds: [],
    curatorIds: [],
    cohortIds: [],
  });
});

// ── Tests: Core calculation ───────────────────────────────────────────

describe("Productivity Score — core calculation", () => {
  it("calculates score from all available components", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt({ score: 100 })]);
    mockAssignmentSubFindMany.mockResolvedValue([
      makeSubmission({ score: 90, assignment: { maxScore: 100 } }),
      makeSubmission({
        id: "sub-2",
        assignmentId: "regular-assign",
        score: 80,
        assignment: { maxScore: 100 },
      }),
    ]);
    mockAssignmentSubFindFirst.mockResolvedValue(
      makeSubmission({ score: 95, assignment: { maxScore: 100 } }),
    );
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 80 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.level).toBeDefined();
    expect(result.components).toHaveLength(5);
    expect(result.calculatedAt).toBeDefined();

    // Diagnostics unavailable
    const diag = result.components.find((c) => c.key === "diagnostics");
    expect(diag?.available).toBe(false);

    // All others available
    const available = result.components.filter((c) => c.key !== "diagnostics");
    for (const c of available) {
      expect(c.available).toBe(true);
    }
  });

  it("works without diagnostics (no data — redistributes weight)", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt({ score: 80 })]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission({ score: 80 })]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission({ score: 80 }));
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 100 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");

    // Diagnostics is 20% and unavailable — should redistribute
    expect(result.totalScore).toBeGreaterThan(0);
    const diag = result.components.find((c) => c.key === "diagnostics");
    expect(diag?.available).toBe(false);
  });

  it("returns beginner level for very low score", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockAssignmentSubFindMany.mockResolvedValue([]);
    mockAssignmentSubFindFirst.mockResolvedValue(null);
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 5 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");
    expect(result.level).toBe("beginner");
    expect(result.totalScore).toBeLessThan(40);
  });

  it("returns champion level for near-perfect score", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt({ score: 100 })]);
    mockAssignmentSubFindMany.mockResolvedValue([
      makeSubmission({ score: 100, assignment: { maxScore: 100 } }),
    ]);
    mockAssignmentSubFindFirst.mockResolvedValue(
      makeSubmission({ score: 100, assignment: { maxScore: 100 } }),
    );
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 100 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");
    expect(result.level).toBe("champion");
    expect(result.totalScore).toBeGreaterThanOrEqual(90);
  });

  it("handles missing final assignment gracefully", async () => {
    mockCourseFindUnique.mockResolvedValue({ id: "course-1", finalAssignmentId: null });
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockAssignmentSubFindMany.mockResolvedValue([]);
    mockAssignmentSubFindFirst.mockResolvedValue(null);
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 50 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");

    const fp = result.components.find((c) => c.key === "final_project");
    expect(fp?.available).toBe(false);
    expect(fp?.detail).toContain("не назначена");
  });

  it("handles unsubmitted final assignment", async () => {
    mockCourseFindUnique.mockResolvedValue(DEFAULT_COURSE);
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockAssignmentSubFindMany.mockResolvedValue([]);
    mockAssignmentSubFindFirst.mockResolvedValue(null);
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 50 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");

    const fp = result.components.find((c) => c.key === "final_project");
    expect(fp?.available).toBe(false);
    expect(fp?.detail).toContain("не сдана");
  });

  it("handles ungraded final assignment", async () => {
    mockCourseFindUnique.mockResolvedValue(DEFAULT_COURSE);
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockAssignmentSubFindMany.mockResolvedValue([]);
    mockAssignmentSubFindFirst.mockResolvedValue(
      makeSubmission({ score: null, status: "SUBMITTED" }),
    );
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 50 }));

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");

    const fp = result.components.find((c) => c.key === "final_project");
    expect(fp?.available).toBe(false);
    expect(fp?.detail).toContain("ещё не оценена");
  });
});

// ── Tests: RBAC ───────────────────────────────────────────────────────

describe("Productivity Score — RBAC", () => {
  it("student sees own score", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(makeActor(["student"]), "user-1", "course-1");
    expect(result.userId).toBe("user-1");
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it("admin sees any student score", async () => {
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(makeActor(["admin"]), "other-user", "course-1");
    expect(result.userId).toBe("other-user");
  });

  it("instructor sees student score for own course", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1", userId: "instr-1" });
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(
      makeActor(["instructor"], "instr-1"),
      "other-user",
      "course-1",
    );
    expect(result.userId).toBe("other-user");
  });

  it("instructor cannot see student score for foreign course", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    await expect(
      getProductivityScore(makeActor(["instructor"], "instr-1"), "other-user", "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("curator sees assigned student score", async () => {
    mockCuratorAssignFindFirst.mockResolvedValue({
      id: "ca-1",
      curatorId: "cur-1",
      studentId: "other-user",
      active: true,
    });
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(
      makeActor(["curator"], "cur-1"),
      "other-user",
      "course-1",
    );
    expect(result.userId).toBe("other-user");
  });

  it("curator cannot see unassigned student score", async () => {
    mockCuratorAssignFindFirst.mockResolvedValue(null);

    await expect(
      getProductivityScore(makeActor(["curator"], "cur-1"), "other-user", "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("super_curator sees student in scope", async () => {
    mockSuperCuratorScope.mockResolvedValue({
      isGlobal: false,
      assignments: [],
      studentIds: ["other-user"],
      curatorIds: [],
      cohortIds: [],
    });
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(
      makeActor(["super_curator"], "sc-1"),
      "other-user",
      "course-1",
    );
    expect(result.userId).toBe("other-user");
  });

  it("super_curator cannot see student outside scope", async () => {
    mockSuperCuratorScope.mockResolvedValue({
      isGlobal: false,
      assignments: [],
      studentIds: [],
      curatorIds: [],
      cohortIds: [],
    });

    await expect(
      getProductivityScore(makeActor(["super_curator"], "sc-1"), "other-user", "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("customer_observer sees student in observed cohort", async () => {
    mockScopedStudentIds.mockResolvedValue(["other-user"]);
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getProductivityScore(
      makeActor(["customer_observer"], "obs-1"),
      "other-user",
      "course-1",
    );
    expect(result.userId).toBe("other-user");
  });

  it("customer_observer cannot see student outside scope", async () => {
    mockScopedStudentIds.mockResolvedValue([]);

    await expect(
      getProductivityScore(makeActor(["customer_observer"], "obs-1"), "other-user", "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("student cannot see other student score", async () => {
    await expect(
      getProductivityScore(makeActor(["student"]), "other-user", "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

// ── Tests: Cohort aggregation ─────────────────────────────────────────

describe("Productivity Score — cohort", () => {
  it("returns cohort summary for admin", async () => {
    mockCohortFindUnique.mockResolvedValue({
      id: "cohort-1",
      courseId: "course-1",
    });
    mockEnrollmentFindMany.mockResolvedValue([
      { userId: "student-1" },
      { userId: "student-2" },
    ]);
    mockCourseFindUnique.mockResolvedValue(DEFAULT_COURSE);
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt({ score: 100 })]);
    mockAssignmentSubFindMany.mockResolvedValue([
      makeSubmission({ score: 90, assignment: { maxScore: 100 } }),
    ]);
    mockAssignmentSubFindFirst.mockResolvedValue(
      makeSubmission({ score: 95, assignment: { maxScore: 100 } }),
    );
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress({ percent: 100 }));

    const result = await getCohortProductivity(makeActor(["admin"]), "cohort-1");

    expect(result.participants).toBe(2);
    expect(result.average).toBeGreaterThan(0);
    expect(result.scores).toHaveLength(2);
    expect(result.distribution).toHaveProperty("beginner");
    expect(result.distribution).toHaveProperty("champion");
  });

  it("returns 0 score for cohort with no course", async () => {
    mockCohortFindUnique.mockResolvedValue({ id: "cohort-1", courseId: null });

    await expect(
      getCohortProductivity(makeActor(["admin"]), "cohort-1"),
    ).rejects.toMatchObject({ code: "bad_request" });
  });

  it("customer_observer sees only allowed cohort", async () => {
    mockCohortFindUnique.mockResolvedValue({
      id: "cohort-1",
      courseId: "course-1",
    });
    mockObserverScope.mockResolvedValue({
      projectIds: [],
      cohortIds: ["cohort-1"],
    });
    mockEnrollmentFindMany.mockResolvedValue([{ userId: "student-1" }]);
    mockCourseFindUnique.mockResolvedValue(DEFAULT_COURSE);
    mockQuizAttemptFindMany.mockResolvedValue([makeQuizAttempt()]);
    mockAssignmentSubFindMany.mockResolvedValue([makeSubmission()]);
    mockAssignmentSubFindFirst.mockResolvedValue(makeSubmission());
    mockCourseProgressFindUnique.mockResolvedValue(makeCourseProgress());

    const result = await getCohortProductivity(
      makeActor(["customer_observer"]),
      "cohort-1",
    );
    expect(result.participants).toBe(1);
  });

  it("customer_observer cannot see disallowed cohort", async () => {
    mockCohortFindUnique.mockResolvedValue({
      id: "cohort-1",
      courseId: "course-1",
    });
    mockObserverScope.mockResolvedValue({ projectIds: [], cohortIds: [] });

    await expect(
      getCohortProductivity(makeActor(["customer_observer"]), "cohort-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

// ── Tests: Edge cases ─────────────────────────────────────────────────

describe("Productivity Score — edge cases", () => {
  it("returns 403 for non-existent course", async () => {
    mockCourseFindUnique.mockResolvedValue(null);

    await expect(
      getProductivityScore(makeActor(["student"]), "user-1", "nonexistent"),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("returns 404 for non-existent cohort", async () => {
    mockCohortFindUnique.mockResolvedValue(null);

    await expect(
      getCohortProductivity(makeActor(["admin"]), "nonexistent"),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("handles empty cohort (no enrollments)", async () => {
    mockCohortFindUnique.mockResolvedValue({ id: "cohort-1", courseId: "course-1" });
    mockEnrollmentFindMany.mockResolvedValue([]);

    const result = await getCohortProductivity(makeActor(["admin"]), "cohort-1");
    expect(result.participants).toBe(0);
    expect(result.average).toBe(0);
    expect(result.scores).toHaveLength(0);
  });
});
