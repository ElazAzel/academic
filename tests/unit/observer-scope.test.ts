import { beforeEach, describe, expect, it, vi } from "vitest";

const mockObserverProjectFindMany = vi.hoisted(() => vi.fn());
const mockObserverCohortFindMany = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    observerProject: { findMany: mockObserverProjectFindMany },
    observerCohort: { findMany: mockObserverCohortFindMany },
    cohort: { findMany: mockCohortFindMany },
    enrollment: { findMany: mockEnrollmentFindMany },
  }),
}));

const { getObserverScope, getScopedStudentIdsForObserver } = await import("@/server/modules/observer/scope");

describe("getObserverScope", () => {
  beforeEach(() => {
    mockObserverProjectFindMany.mockReset();
    mockObserverCohortFindMany.mockReset();
    mockCohortFindMany.mockReset();
    mockEnrollmentFindMany.mockReset();
  });

  it("returns an empty restricted scope when no links exist", async () => {
    mockObserverProjectFindMany.mockResolvedValue([]);
    mockObserverCohortFindMany.mockResolvedValue([]);

    const scope = await getObserverScope("observer-1");
    expect(scope).toEqual({ isUnrestricted: false, projectIds: [], cohortIds: [] });
  });

  it("resolves cohort scope from ObserverProject links", async () => {
    mockObserverProjectFindMany.mockResolvedValue([{ projectId: "proj-A" }, { projectId: "proj-B" }]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([{ id: "cohort-1" }, { id: "cohort-2" }]);

    const scope = await getObserverScope("observer-1");
    expect(scope.isUnrestricted).toBe(false);
    expect(scope.projectIds).toEqual(["proj-A", "proj-B"]);
    expect(scope.cohortIds).toEqual(["cohort-1", "cohort-2"]);
  });

  it("unions direct ObserverCohort with project-derived cohorts", async () => {
    mockObserverProjectFindMany.mockResolvedValue([{ projectId: "proj-A" }]);
    mockObserverCohortFindMany.mockResolvedValue([{ cohortId: "direct-cohort" }]);
    mockCohortFindMany.mockResolvedValue([{ id: "proj-cohort" }]);

    const scope = await getObserverScope("observer-1");
    expect(scope.cohortIds.sort()).toEqual(["direct-cohort", "proj-cohort"]);
  });

  it("filters out null projectIds from ObserverProject rows", async () => {
    mockObserverProjectFindMany.mockResolvedValue([{ projectId: null }, { projectId: "proj-A" }]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([{ id: "cohort-1" }]);

    const scope = await getObserverScope("observer-1");
    expect(scope.projectIds).toEqual(["proj-A"]);
  });
});

describe("getScopedStudentIdsForObserver", () => {
  beforeEach(() => {
    mockObserverProjectFindMany.mockReset();
    mockObserverCohortFindMany.mockReset();
    mockCohortFindMany.mockReset();
    mockEnrollmentFindMany.mockReset();
  });

  it("returns empty array when no observer links exist", async () => {
    mockObserverProjectFindMany.mockResolvedValue([]);
    mockObserverCohortFindMany.mockResolvedValue([]);

    const ids = await getScopedStudentIdsForObserver("observer-1");
    expect(ids).toEqual([]);
  });

  it("returns empty array when restricted but no cohorts resolve", async () => {
    mockObserverProjectFindMany.mockResolvedValue([{ projectId: "proj-empty" }]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([]);

    const ids = await getScopedStudentIdsForObserver("observer-1");
    expect(ids).toEqual([]);
  });

  it("returns deduplicated student userIds across enrolled cohorts", async () => {
    mockObserverProjectFindMany.mockResolvedValue([{ projectId: "proj-A" }]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([{ id: "cohort-1" }, { id: "cohort-2" }]);
    mockEnrollmentFindMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u1" }, // duplicate
    ]);

    const ids = await getScopedStudentIdsForObserver("observer-1");
    expect(ids?.sort()).toEqual(["u1", "u2"]);
  });
});
