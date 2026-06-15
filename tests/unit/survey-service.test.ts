import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoleKey as PrismaRoleKey } from "@prisma/client";
import {
  submitCourseSurvey,
  getCourseSurvey,
  hasCompletedSurvey,
  courseSurveyDataSchema,
} from "@/server/modules/survey/service";
import type { AppSessionUser } from "@/types/domain";

// ── Hoisted mocks ─────────────────────────────────────────────────────

const {
  mockSurveyFindUnique,
  mockSurveyUpsert,
  mockEnrollmentFindFirst,
  mockCourseInstructorFindUnique,
  mockCuratorAssignmentFindFirst,
} = vi.hoisted(() => ({
  mockSurveyFindUnique: vi.fn(),
  mockSurveyUpsert: vi.fn(),
  mockEnrollmentFindFirst: vi.fn(),
  mockCourseInstructorFindUnique: vi.fn(),
  mockCuratorAssignmentFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    courseSurvey: {
      findUnique: mockSurveyFindUnique,
      upsert: mockSurveyUpsert,
    },
    enrollment: {
      findFirst: mockEnrollmentFindFirst,
    },
    courseInstructor: {
      findUnique: mockCourseInstructorFindUnique,
    },
    curatorAssignment: {
      findFirst: mockCuratorAssignmentFindFirst,
    },
  }),
}));

// Mocks for dynamic imports in RBAC
vi.mock("@/server/modules/super-curator/scope", () => ({
  getSuperCuratorScope: vi.fn().mockResolvedValue({
    isGlobal: false,
    studentIds: ["student-2"],
    cohortIds: [],
    curatorIds: [],
    assignments: [],
  }),
}));

vi.mock("@/server/modules/observer/scope", () => ({
  getScopedStudentIdsForObserver: vi.fn().mockResolvedValue(["student-2"]),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeActor(
  roles: string[],
  overrides?: Partial<AppSessionUser>,
): AppSessionUser {
  return {
    id: "student-1",
    email: "student@test.com",
    name: "Student",
    roles: roles as unknown as PrismaRoleKey[],
    ...overrides,
  } as AppSessionUser;
}

const VALID_DATA = {
  satisfaction: 4,
  nps: 8,
  usefulness: 5,
  applicability: 4,
  publicComment: false,
  automationSummary: "Автоматизировал отчёты",
  improvementSuggestions: "Больше практики",
};

const MOCK_SURVEY = {
  id: "survey-1",
  userId: "student-1",
  courseId: "course-1",
  data: VALID_DATA,
  createdAt: new Date("2026-06-15T10:00:00Z"),
  updatedAt: new Date("2026-06-15T10:00:00Z"),
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("courseSurveyDataSchema", () => {
  it("validates valid survey data", () => {
    const result = courseSurveyDataSchema.safeParse(VALID_DATA);
    expect(result.success).toBe(true);
  });

  it("rejects satisfaction out of range", () => {
    const result = courseSurveyDataSchema.safeParse({ ...VALID_DATA, satisfaction: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects nps out of range", () => {
    const result = courseSurveyDataSchema.safeParse({ ...VALID_DATA, nps: 11 });
    expect(result.success).toBe(false);
  });

  it("accepts minimal valid data", () => {
    const result = courseSurveyDataSchema.safeParse({
      satisfaction: 3,
      nps: 5,
      usefulness: 3,
      applicability: 4,
      publicComment: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("submitCourseSurvey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnrollmentFindFirst.mockResolvedValue({ id: "enr-1" });
    mockSurveyUpsert.mockResolvedValue(MOCK_SURVEY);
  });

  it("submits survey for enrolled student", async () => {
    const result = await submitCourseSurvey(
      makeActor(["student"]),
      "course-1",
      VALID_DATA,
    );

    expect(result.userId).toBe("student-1");
    expect(result.data.satisfaction).toBe(4);
    expect(result.data.nps).toBe(8);
    expect(mockSurveyUpsert).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: "student-1", courseId: "course-1" } },
      create: expect.objectContaining({ userId: "student-1", courseId: "course-1" }),
      update: expect.objectContaining({}),
    });
  });

  it("updates existing survey on re-submit", async () => {
    mockSurveyUpsert.mockResolvedValue({
      ...MOCK_SURVEY,
      data: { ...VALID_DATA, satisfaction: 5 },
      updatedAt: new Date("2026-06-15T12:00:00Z"),
    });

    const result = await submitCourseSurvey(
      makeActor(["student"]),
      "course-1",
      { ...VALID_DATA, satisfaction: 5 },
    );

    expect(result.data.satisfaction).toBe(5);
  });

  it("rejects survey from non-enrolled user", async () => {
    mockEnrollmentFindFirst.mockResolvedValue(null);

    await expect(
      submitCourseSurvey(makeActor(["student"]), "course-1", VALID_DATA),
    ).rejects.toThrow("Вы не зачислены на этот курс");
  });
});

describe("getCourseSurvey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns own survey", async () => {
    mockSurveyFindUnique.mockResolvedValue(MOCK_SURVEY);

    const result = await getCourseSurvey(
      makeActor(["student"]),
      "student-1",
      "course-1",
    );

    expect(result).not.toBeNull();
    expect(result!.data.satisfaction).toBe(4);
  });

  it("returns null when no survey exists", async () => {
    mockSurveyFindUnique.mockResolvedValue(null);

    const result = await getCourseSurvey(
      makeActor(["student"]),
      "student-1",
      "course-1",
    );

    expect(result).toBeNull();
  });

  it("allows admin to read any survey", async () => {
    mockSurveyFindUnique.mockResolvedValue(MOCK_SURVEY);

    const result = await getCourseSurvey(
      makeActor(["admin"]),
      "student-1",
      "course-1",
    );

    expect(result).not.toBeNull();
  });

  it("forbids student from reading another student's survey", async () => {
    mockSurveyFindUnique.mockResolvedValue(MOCK_SURVEY);

    await expect(
      getCourseSurvey(makeActor(["student"], { id: "other-1" }), "student-1", "course-1"),
    ).rejects.toThrow("Нет доступа к данным опроса");
  });

  it("allows instructor of the course to read surveys", async () => {
    mockSurveyFindUnique.mockResolvedValue(MOCK_SURVEY);
    mockCourseInstructorFindUnique.mockResolvedValue({ id: "ci-1" });

    const result = await getCourseSurvey(
      makeActor(["instructor"]),
      "student-1",
      "course-1",
    );

    expect(result).not.toBeNull();
  });

  it("allows assigned curator to read surveys", async () => {
    mockSurveyFindUnique.mockResolvedValue(MOCK_SURVEY);
    mockCuratorAssignmentFindFirst.mockResolvedValue({ id: "ca-1" });

    const result = await getCourseSurvey(
      makeActor(["curator"]),
      "student-1",
      "course-1",
    );

    expect(result).not.toBeNull();
  });
});

describe("hasCompletedSurvey", () => {
  it("returns true when survey exists", async () => {
    mockSurveyFindUnique.mockResolvedValue({ id: "survey-1" });

    const result = await hasCompletedSurvey("student-1", "course-1");
    expect(result).toBe(true);
  });

  it("returns false when no survey", async () => {
    mockSurveyFindUnique.mockResolvedValue(null);

    const result = await hasCompletedSurvey("student-1", "course-1");
    expect(result).toBe(false);
  });
});
