import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockCourseUpdate = vi.hoisted(() => vi.fn());
const mockModuleUpdate = vi.hoisted(() => vi.fn());
const mockBlockUpdate = vi.hoisted(() => vi.fn());
const mockLessonUpdate = vi.hoisted(() => vi.fn());
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
    block: { update: mockBlockUpdate },
    lesson: { update: mockLessonUpdate },
    auditLog: { create: mockAuditLogCreate },
    $transaction: mock$transaction,
  }),
}));

const { getCourseForBuilder, updateCourseSettings, reorderModules, publishCourseFromBuilder, saveCourseBuilderSnapshot } = await import("@/server/modules/course-builder/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    id: "actor1",
    roles: [{ role: { key: "admin" } }],
  });
});

describe("getCourseForBuilder", () => {
  it("returns course with modules for authorized instructor", async () => {
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
    mockCourseFindUnique.mockResolvedValue(null);

    await expect(getCourseForBuilder("missing", "actor1")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});

describe("updateCourseSettings", () => {
  it("updates course fields", async () => {
    mockCourseUpdate.mockResolvedValue({
      id: "c1",
      title: "Updated Title",
      description: "Updated",
      status: "DRAFT",
    });

    const result = await updateCourseSettings(
      "c1",
      { title: "Updated Title", description: "Updated", status: "DRAFT" },
      "actor1",
    );
    expect(result.title).toBe("Updated Title");
    expect(mockCourseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({
          title: "Updated Title",
          status: "DRAFT",
        }),
      }),
    );
  });
});

describe("publishCourseFromBuilder", () => {
  it("blocks publication when checklist fails", async () => {
    mockCourseFindUnique.mockResolvedValue({
      id: "c1",
      slug: "test-course",
      title: "Test Course",
      description: "short",
      goal: null,
      coverUrl: null,
      durationHours: 0,
      status: "DRAFT",
      traversalMode: "sequential",
      completionThreshold: 85,
      modules: [],
    });

    await expect(publishCourseFromBuilder("c1", "actor1")).rejects.toMatchObject({ code: "bad_request", status: 400 });
    expect(mockCourseUpdate).not.toHaveBeenCalled();
  });

  it("publishes when checklist passes", async () => {
    mockCourseFindUnique.mockResolvedValue({
      id: "c1",
      slug: "test-course",
      title: "Test Course",
      description: "Long enough course description",
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
          blocks: [],
          lessons: [
            {
              id: "l1",
              order: 0,
              title: "Lesson 1",
              type: "MIXED",
              summary: null,
              durationMinutes: 20,
              isRequired: true,
              blockId: null,
              content: { blocks: [{ id: "b1", type: "text", data: { html: "Material" } }] },
              videoUrl: null,
              quizzes: [],
              assignments: [],
            },
          ],
        },
      ],
    });
    mockCourseUpdate.mockResolvedValue({ id: "c1", status: "PUBLISHED" });

    await publishCourseFromBuilder("c1", "actor1");

    expect(mockCourseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
  });
});

describe("saveCourseBuilderSnapshot", () => {
  it("persists course, module, block, and lesson updates in one transaction", async () => {
    mockCourseFindUnique
      .mockResolvedValueOnce({
        id: "c1",
        modules: [
          {
            id: "m1",
            blocks: [{ id: "b1" }],
            lessons: [{ id: "l1" }],
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "c1",
        slug: "test-course",
        title: "Updated Course",
        description: "Long enough course description",
        goal: null,
        coverUrl: null,
        durationHours: 10,
        status: "DRAFT",
        traversalMode: "sequential",
        completionThreshold: 85,
        modules: [],
      });

    await saveCourseBuilderSnapshot(
      "c1",
      {
        title: "Updated Course",
        description: "Long enough course description",
        durationHours: 10,
        traversalMode: "sequential",
        completionThreshold: 85,
        modules: [
          {
            id: "m1",
            order: 0,
            title: "Updated Module",
            description: null,
            recommendedDays: 7,
            status: "DRAFT",
            blocks: [
              {
                id: "b1",
                order: 0,
                title: "Updated Block",
                description: null,
                lessons: [
                  {
                    id: "l1",
                    order: 0,
                    title: "Updated Lesson",
                    summary: null,
                    type: "MIXED",
                    videoUrl: null,
                    durationMinutes: 20,
                    isRequired: true,
                    blockId: "b1",
                  },
                ],
              },
            ],
            lessons: [],
          },
        ],
      },
      "actor1",
    );

    expect(mock$transaction).toHaveBeenCalledTimes(1);
    expect(mockCourseUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "c1" } }));
    expect(mockModuleUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "m1" } }));
    expect(mockBlockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "b1" } }));
    expect(mockLessonUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "l1" } }));
  });
});

describe("reorderModules", () => {
  it("reorders modules sequentially", async () => {
    await reorderModules("c1", ["m1", "m2", "m3"], "actor1");

    expect(mockModuleUpdate).toHaveBeenCalledTimes(3);
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(1, { where: { id: "m1" }, data: { order: 0 } });
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(2, { where: { id: "m2" }, data: { order: 1 } });
    expect(mockModuleUpdate).toHaveBeenNthCalledWith(3, { where: { id: "m3" }, data: { order: 2 } });
  });
});
