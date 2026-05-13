import { describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockCourseUpdate = vi.hoisted(() => vi.fn());
const mockModuleUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());

const mock$transaction = vi.hoisted(() => vi.fn(async (arg: unknown) => {
  if (Array.isArray(arg)) return Promise.all(arg);
  if (typeof arg === "function") return (arg as () => unknown)();
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mockUserFindUnique },
    course: {
      findUnique: mockCourseFindUnique,
      update: mockCourseUpdate,
    },
    module: { update: mockModuleUpdate },
    auditLog: { create: mockAuditLogCreate },
    $transaction: mock$transaction,
  }),
}));

const { getCourseForBuilder, updateCourseSettings, reorderModules } = await import("@/server/modules/course-builder/service");

describe("getCourseForBuilder", () => {
  it("returns course with modules for authorized instructor", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "actor1",
      roles: [{ role: { key: "admin" } }],
    });
    mockCourseFindUnique.mockResolvedValue({
      id: "c1",
      slug: "test-course",
      title: "Test Course",
      description: "A test",
      goal: null,
      coverUrl: null,
      durationHours: 10,
      status: "DRAFT",
      traversalMode: "sequential",
      completionThreshold: 85,
      modules: [
        {
          id: "m1",
          order: 0,
          title: "Module 1",
          description: null,
          recommendedDays: 7,
          status: "DRAFT",
          lessons: [],
        },
      ],
    });

    const result = await getCourseForBuilder("c1", "actor1");
    expect(result.id).toBe("c1");
    expect(result.title).toBe("Test Course");
    expect(result.modules).toHaveLength(1);
    expect(result.modules[0].title).toBe("Module 1");
  });

  it("throws 404 when course not found", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "actor1",
      roles: [{ role: { key: "admin" } }],
    });
    mockCourseFindUnique.mockResolvedValue(null);

    await expect(getCourseForBuilder("missing", "actor1")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});

describe("updateCourseSettings", () => {
  it("updates course fields", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "actor1",
      roles: [{ role: { key: "admin" } }],
    });
    mockCourseUpdate.mockResolvedValue({
      id: "c1",
      title: "Updated Title",
      description: "Updated",
      status: "PUBLISHED",
    });

    const result = await updateCourseSettings(
      "c1",
      { title: "Updated Title", description: "Updated", status: "PUBLISHED" },
      "actor1",
    );
    expect(result.title).toBe("Updated Title");
    expect(mockCourseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({
          title: "Updated Title",
          status: "PUBLISHED",
        }),
      }),
    );
  });
});

describe("reorderModules", () => {
  it("reorders modules sequentially", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "actor1",
      roles: [{ role: { key: "admin" } }],
    });

    await reorderModules("c1", ["m1", "m2", "m3"], "actor1");

    expect(mockModuleUpdate).toHaveBeenCalledTimes(3);
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(1, { where: { id: "m1" }, data: { order: 0 } });
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(2, { where: { id: "m2" }, data: { order: 1 } });
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(3, { where: { id: "m3" }, data: { order: 2 } });
  });
});
