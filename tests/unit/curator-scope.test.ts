import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock Prisma ─────────────────────────────────────────────────────────
const mockCuratorAssignmentFindFirst = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockCourseProgressFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    curatorAssignment: {
      findFirst: mockCuratorAssignmentFindFirst,
      findMany: mockCuratorAssignmentFindMany,
    },
    enrollment: { findMany: mockEnrollmentFindMany },
    courseProgress: { findMany: mockCourseProgressFindMany },
  }),
}));

// ── Test helpers that replicate curator scope logic ────────────────────
// These mimic the inline curator access patterns used in server actions.

/** Simulates DB storage of curator assignments. Tests push into this. */
type AssignmentStoreRow = {
  studentId: string;
  curatorId: string;
  cohortId: string;
  active: boolean;
};

let assignmentStore: AssignmentStoreRow[] = [];

function resetStore() {
  assignmentStore = [];
}

// Setup mock implementations that query the in-memory store
beforeEach(() => {
  resetStore();
  vi.clearAllMocks();

  mockCuratorAssignmentFindMany.mockImplementation(
    ({ where }: { where: { curatorId: string; active: boolean } }) => {
      return Promise.resolve(
        assignmentStore.filter(
          (a) => a.curatorId === where.curatorId && a.active === where.active,
        ),
      );
    },
  );

  mockCuratorAssignmentFindFirst.mockImplementation(
    ({ where }: { where: { curatorId: string; studentId?: string; active: boolean } }) => {
      const match = assignmentStore.find(
        (a) =>
          a.curatorId === where.curatorId &&
          a.active === where.active &&
          (where.studentId === undefined || a.studentId === where.studentId),
      );
      return Promise.resolve(match ?? null);
    },
  );
});

async function getCuratorStudentIds(curatorId: string): Promise<string[]> {
  const assignments = (await mockCuratorAssignmentFindMany({
    where: { curatorId, active: true },
  })) as AssignmentStoreRow[];
  return [...new Set(assignments.map((a) => a.studentId))];
}

async function assertCuratorStudentAccess(
  curatorId: string,
  studentId: string,
): Promise<boolean> {
  const assignment = await mockCuratorAssignmentFindFirst({
    where: { curatorId, studentId, active: true },
  });
  return assignment !== null;
}

async function getCuratorCohortIds(curatorId: string): Promise<string[]> {
  const assignments = (await mockCuratorAssignmentFindMany({
    where: { curatorId, active: true },
  })) as AssignmentStoreRow[];
  return [...new Set(assignments.map((a) => a.cohortId))];
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("curator scope — student access", () => {
  describe("getCuratorStudentIds", () => {
    it("returns empty array when no assignments", async () => {
      // Store is empty
      const ids = await getCuratorStudentIds("curator-1");
      expect(ids).toEqual([]);
      expect(mockCuratorAssignmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { curatorId: "curator-1", active: true } }),
      );
    });

    it("returns deduplicated student IDs from active assignments", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-2", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-2", active: true },
      );

      const ids = await getCuratorStudentIds("curator-1");
      expect(ids.sort()).toEqual(["student-1", "student-2"]);
    });

    it("excludes inactive assignments", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-2", curatorId: "curator-1", cohortId: "cohort-1", active: false },
      );

      const ids = await getCuratorStudentIds("curator-1");
      expect(ids).toEqual(["student-1"]);
    });

    it("only returns students assigned to the given curator", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-2", curatorId: "curator-2", cohortId: "cohort-1", active: true },
        { studentId: "student-3", curatorId: "curator-1", cohortId: "cohort-2", active: true },
        { studentId: "student-4", curatorId: "curator-2", cohortId: "cohort-2", active: true },
      );

      const ids = await getCuratorStudentIds("curator-1");
      expect(ids.sort()).toEqual(["student-1", "student-3"]);
    });
  });

  describe("assertCuratorStudentAccess", () => {
    it("returns true when assignment exists", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
      );

      const allowed = await assertCuratorStudentAccess("curator-1", "student-1");
      expect(allowed).toBe(true);
    });

    it("returns false when no assignment exists", async () => {
      const allowed = await assertCuratorStudentAccess("curator-1", "student-unknown");
      expect(allowed).toBe(false);
    });

    it("returns false when assignment is inactive", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: false },
      );

      const allowed = await assertCuratorStudentAccess("curator-1", "student-1");
      expect(allowed).toBe(false);
    });

    it("only matches exact curatorId", async () => {
      assignmentStore.push(
        { studentId: "student-2", curatorId: "curator-2", cohortId: "cohort-1", active: true },
      );

      const allowed = await assertCuratorStudentAccess("curator-1", "student-2");
      expect(allowed).toBe(false);
    });
  });
});

describe("curator scope — cohort access", () => {
  describe("getCuratorCohortIds", () => {
    it("returns empty array when no assignments", async () => {
      const ids = await getCuratorCohortIds("curator-1");
      expect(ids).toEqual([]);
    });

    it("returns deduplicated cohort IDs", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-2", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-3", curatorId: "curator-1", cohortId: "cohort-2", active: true },
      );

      const ids = await getCuratorCohortIds("curator-1");
      expect(ids.sort()).toEqual(["cohort-1", "cohort-2"]);
    });

    it("excludes inactive assignments", async () => {
      assignmentStore.push(
        { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
        { studentId: "student-2", curatorId: "curator-1", cohortId: "cohort-2", active: false },
      );

      const ids = await getCuratorCohortIds("curator-1");
      expect(ids).toEqual(["cohort-1"]);
    });
  });
});

describe("curator scope — edge cases", () => {
  it("handles curator with no students gracefully", async () => {
    const ids = await getCuratorStudentIds("new-curator");
    expect(ids).toEqual([]);
  });

  it("handles curator with only inactive assignments", async () => {
    assignmentStore.push(
      { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: false },
      { studentId: "student-2", curatorId: "curator-1", cohortId: "cohort-2", active: false },
    );

    const ids = await getCuratorStudentIds("curator-1");
    expect(ids).toEqual([]);
    const cohortIds = await getCuratorCohortIds("curator-1");
    expect(cohortIds).toEqual([]);
  });

  it("preserves unique students across multiple cohorts", async () => {
    assignmentStore.push(
      { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-1", active: true },
      { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-2", active: true },
      { studentId: "student-1", curatorId: "curator-1", cohortId: "cohort-3", active: true },
    );

    const ids = await getCuratorStudentIds("curator-1");
    expect(ids).toEqual(["student-1"]);
  });
});
