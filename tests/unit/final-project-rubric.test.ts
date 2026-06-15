import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoleKey as PrismaRoleKey } from "@prisma/client";
import {
  buildRubric,
  gradeFinalProject,
  getFinalProjectRubric,
  finalProjectRubricSchema,
} from "@/server/modules/productivity-score";
import type { AppSessionUser } from "@/types/domain";
import type { FinalProjectRubric } from "@/server/modules/productivity-score/final-project";

// ── Mocks (using vi.hoisted to avoid hoisting issues) ─────────────────

const { mockSubmissionFindUnique, mockSubmissionUpdate, mockCourseInstructorFindUnique, mockCuratorAssignmentFindFirst } = vi.hoisted(() => ({
  mockSubmissionFindUnique: vi.fn(),
  mockSubmissionUpdate: vi.fn(),
  mockCourseInstructorFindUnique: vi.fn(),
  mockCuratorAssignmentFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    assignmentSubmission: {
      findUnique: mockSubmissionFindUnique,
      update: mockSubmissionUpdate,
    },
    courseInstructor: {
      findUnique: mockCourseInstructorFindUnique,
    },
    curatorAssignment: {
      findFirst: mockCuratorAssignmentFindFirst,
    },
  }),
}));

function makeActor(
  roles: string[],
  overrides?: Partial<AppSessionUser>,
): AppSessionUser {
  return {
    id: "actor-1",
    email: "actor@test.com",
    name: "Actor",
    roles: roles as unknown as PrismaRoleKey[],
    ...overrides,
  } as AppSessionUser;
}

const DEFAULT_SUBMISSION = {
  id: "sub-1",
  userId: "student-1",
  metadata: null,
  assignment: {
    courseId: "course-1",
  },
};

const CHAMPION_RUBRIC: FinalProjectRubric = {
  criteria: [
    { criterionNumber: 1, label: "Задача реально относится к работе участника", score: 20, maxScore: 20 },
    { criterionNumber: 2, label: "Описано состояние «до» и «после»", score: 18, maxScore: 20 },
    { criterionNumber: 3, label: "AI применён осмысленно", score: 19, maxScore: 20 },
    { criterionNumber: 4, label: "Есть готовый артефакт", score: 18, maxScore: 20 },
    { criterionNumber: 5, label: "Есть оценка экономии времени", score: 9, maxScore: 10 },
    { criterionNumber: 6, label: "Решение можно повторно использовать", score: 8, maxScore: 10 },
  ],
  totalScore: 92,
  level: "champion",
  savedAt: "2026-06-15T10:00:00.000Z",
  savedByUserId: "curator-1",
};

const MINIMAL_RUBRIC: FinalProjectRubric = {
  criteria: [
    { criterionNumber: 1, label: "Задача реально относится к работе участника", score: 5, maxScore: 20 },
    { criterionNumber: 2, label: "Описано состояние «до» и «после»", score: 6, maxScore: 20 },
    { criterionNumber: 3, label: "AI применён осмысленно", score: 5, maxScore: 20 },
    { criterionNumber: 4, label: "Есть готовый артефакт", score: 5, maxScore: 20 },
    { criterionNumber: 5, label: "Есть оценка экономии времени", score: 2, maxScore: 10 },
    { criterionNumber: 6, label: "Решение можно повторно использовать", score: 2, maxScore: 10 },
  ],
  totalScore: 25,
  level: "beginner",
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("buildRubric", () => {
  it("builds a champion-level rubric from scores", () => {
    const rubric = buildRubric([20, 18, 19, 18, 9, 8]);
    expect(rubric.totalScore).toBe(92);
    expect(rubric.level).toBe("champion");
    expect(rubric.criteria).toHaveLength(6);
    expect(rubric.criteria[0].score).toBe(20);
    expect(rubric.criteria[5].score).toBe(8);
    expect(rubric.savedAt).toBeDefined();
  });

  it("builds a beginner-level rubric from low scores", () => {
    const rubric = buildRubric([5, 6, 5, 5, 2, 2]);
    expect(rubric.totalScore).toBe(25);
    expect(rubric.level).toBe("beginner");
  });

  it("builds a practitioner-level rubric", () => {
    const rubric = buildRubric([12, 14, 10, 12, 5, 4]);
    expect(rubric.totalScore).toBe(57);
    expect(rubric.level).toBe("practitioner");
  });

  it("builds an advanced-level rubric", () => {
    const rubric = buildRubric([18, 16, 17, 16, 8, 7]);
    expect(rubric.totalScore).toBe(82);
    expect(rubric.level).toBe("advanced");
  });

  it("clamps scores to maxScore", () => {
    const rubric = buildRubric([99, 99, 99, 99, 99, 99]);
    expect(rubric.totalScore).toBe(100);
    expect(rubric.criteria[0].score).toBe(20);
    expect(rubric.criteria[4].score).toBe(10);
    expect(rubric.criteria[5].score).toBe(10);
  });

  it("includes optional fields when provided", () => {
    const rubric = buildRubric([10, 10, 10, 10, 5, 5], {
      curatorComment: "Хорошая работа",
      recommendation: "Добавить оценку экономии",
      savedByUserId: "curator-1",
    });
    expect(rubric.curatorComment).toBe("Хорошая работа");
    expect(rubric.recommendation).toBe("Добавить оценку экономии");
    expect(rubric.savedByUserId).toBe("curator-1");
  });
});

describe("finalProjectRubricSchema", () => {
  it("validates a valid rubric", () => {
    const result = finalProjectRubricSchema.safeParse(CHAMPION_RUBRIC);
    expect(result.success).toBe(true);
  });

  it("rejects rubric with missing fields", () => {
    const result = finalProjectRubricSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects rubric with wrong criterion count", () => {
    const bad = {
      ...CHAMPION_RUBRIC,
      criteria: [{ criterionNumber: 1, label: "Only one", score: 10, maxScore: 20 }],
    };
    const result = finalProjectRubricSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid level", () => {
    const bad = { ...CHAMPION_RUBRIC, level: "superman" };
    const result = finalProjectRubricSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

describe("gradeFinalProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmissionFindUnique.mockResolvedValue(DEFAULT_SUBMISSION);
    mockSubmissionUpdate.mockResolvedValue({ id: "sub-1" });
    mockCourseInstructorFindUnique.mockResolvedValue(null);
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);
  });

  it("allows admin to grade any submission", async () => {
    const result = await gradeFinalProject(
      makeActor(["admin"]),
      "sub-1",
      [20, 18, 19, 18, 9, 8],
    );

    expect(result.totalScore).toBe(92);
    expect(result.level).toBe("champion");
    expect(mockSubmissionUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        score: 92,
        metadata: expect.objectContaining({ totalScore: 92, level: "champion" }),
      }),
    });
  });

  it("allows instructor of the course to grade", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue({ id: "ci-1" });

    const result = await gradeFinalProject(
      makeActor(["instructor"]),
      "sub-1",
      [10, 10, 10, 10, 5, 5],
    );

    expect(result.totalScore).toBe(50);
  });

  it("allows assigned curator to grade", async () => {
    mockCuratorAssignmentFindFirst.mockResolvedValue({ id: "ca-1" });

    const result = await gradeFinalProject(
      makeActor(["curator"]),
      "sub-1",
      [10, 10, 10, 10, 5, 5],
    );

    expect(result.totalScore).toBe(50);
  });

  it("forbids unassigned curator from grading", async () => {
    await expect(
      gradeFinalProject(makeActor(["curator"]), "sub-1", [10, 10, 10, 10, 5, 5]),
    ).rejects.toThrow("Нет права оценивать эту работу");
  });

  it("forbids instructor of another course from grading", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    await expect(
      gradeFinalProject(makeActor(["instructor"]), "sub-1", [10, 10, 10, 10, 5, 5]),
    ).rejects.toThrow("Нет права оценивать эту работу");
  });

  it("forbids student from grading", async () => {
    await expect(
      gradeFinalProject(makeActor(["student"]), "sub-1", [10, 10, 10, 10, 5, 5]),
    ).rejects.toThrow("Нет права оценивать эту работу");
  });

  it("throws 404 for non-existent submission", async () => {
    mockSubmissionFindUnique.mockResolvedValue(null);

    await expect(
      gradeFinalProject(makeActor(["admin"]), "nonexistent", [10, 10, 10, 10, 5, 5]),
    ).rejects.toThrow("Работа не найдена");
  });
});

describe("getFinalProjectRubric", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no metadata exists", async () => {
    mockSubmissionFindUnique.mockResolvedValue(DEFAULT_SUBMISSION);

    const result = await getFinalProjectRubric(makeActor(["student"], { id: "student-1" }), "sub-1");
    expect(result).toBeNull();
  });

  it("returns rubric for own submission (student)", async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      ...DEFAULT_SUBMISSION,
      metadata: CHAMPION_RUBRIC,
    });

    const result = await getFinalProjectRubric(makeActor(["student"], { id: "student-1" }), "sub-1");
    expect(result).not.toBeNull();
    expect(result!.totalScore).toBe(92);
    expect(result!.level).toBe("champion");
  });

  it("allows admin to read any rubric", async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      ...DEFAULT_SUBMISSION,
      metadata: MINIMAL_RUBRIC,
    });

    const result = await getFinalProjectRubric(makeActor(["admin"]), "sub-1");
    expect(result).not.toBeNull();
    expect(result!.totalScore).toBe(25);
  });

  it("forbids student from reading another student's rubric", async () => {
    mockSubmissionFindUnique.mockResolvedValue({
      ...DEFAULT_SUBMISSION,
      userId: "student-2",
      metadata: CHAMPION_RUBRIC,
    });

    await expect(
      getFinalProjectRubric(makeActor(["student"], { id: "student-1" }), "sub-1"),
    ).rejects.toThrow("Нет права оценивать эту работу");
  });

  it("throws 404 for non-existent submission", async () => {
    mockSubmissionFindUnique.mockResolvedValue(null);

    await expect(
      getFinalProjectRubric(makeActor(["admin"]), "nonexistent"),
    ).rejects.toThrow("Работа не найдена");
  });
});
