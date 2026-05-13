import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockEnrollStudent = vi.hoisted(() => vi.fn());
const mockCreateUserFn = vi.hoisted(() => vi.fn());

const mockCohortCreate = vi.hoisted(() => vi.fn());
const mockCohortUpdate = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentUpdate = vi.hoisted(() => vi.fn());
const mockEnrollmentDelete = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentUpsert = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentDeleteMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/server/modules/audit/service", () => ({ logAudit: mockLogAudit }));
vi.mock("@/server/modules/courses/service", () => ({ enrollStudent: mockEnrollStudent }));
vi.mock("@/server/modules/users/service", () => ({ createUser: mockCreateUserFn }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    cohort: { create: mockCohortCreate, update: mockCohortUpdate },
    enrollment: { findUnique: mockEnrollmentFindUnique, update: mockEnrollmentUpdate, delete: mockEnrollmentDelete },
    curatorAssignment: { upsert: mockCuratorAssignmentUpsert, deleteMany: mockCuratorAssignmentDeleteMany },
  }),
}));

const {
  enrollStudentAction, assignCuratorAction, pauseEnrollmentAction,
  resumeEnrollmentAction, deleteEnrollmentAction, createCohortAction,
  updateCohortAction, deleteCohortAction, createUserAction, assignCuratorFromSupervisorAction,
} = await import("@/server/actions/admin");

const adminUser = { id: "admin1", email: "admin@test.com", name: "Admin", roles: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(adminUser);
});

describe("enrollStudentAction", () => {
  it("enrolls a student", async () => {
    const fd = new FormData();
    fd.set("userId", "u1"); fd.set("courseId", "c1");

    const result = await enrollStudentAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockEnrollStudent).toHaveBeenCalledWith({ userId: "u1", courseId: "c1", cohortId: undefined }, "admin1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("enrolls with curator and cohort", async () => {
    const fd = new FormData();
    fd.set("userId", "u1"); fd.set("courseId", "c1"); fd.set("cohortId", "coh1"); fd.set("curatorId", "cur1");

    const result = await enrollStudentAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockCuratorAssignmentUpsert).toHaveBeenCalled();
  });

  it("throws without userId or courseId", async () => {
    const fd = new FormData();
    fd.set("userId", "u1");
    await expect(enrollStudentAction(fd)).rejects.toThrow("Не указан студент или курс");
  });

  it("throws if curatorId without cohortId", async () => {
    const fd = new FormData();
    fd.set("userId", "u1"); fd.set("courseId", "c1"); fd.set("curatorId", "cur1");
    await expect(enrollStudentAction(fd)).rejects.toThrow("Для назначения куратора необходимо выбрать поток");
  });
});

describe("assignCuratorAction", () => {
  it("assigns curator and logs audit", async () => {
    const result = await assignCuratorAction({ studentId: "u1", curatorId: "cur1", cohortId: "coh1" });
    expect(result).toEqual({ success: true });
    expect(mockCuratorAssignmentUpsert).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "curator.assigned" }));
  });
});

describe("assignCuratorFromSupervisorAction", () => {
  it("super_curator assigns curator", async () => {
    mockRequireRole.mockResolvedValue({ id: "sc1", email: "sc@test.com", name: "Super", roles: ["super_curator"] });

    const fd = new FormData();
    fd.set("studentId", "u1"); fd.set("curatorId", "cur1"); fd.set("cohortId", "coh1");

    const result = await assignCuratorFromSupervisorAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockCuratorAssignmentUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ superCuratorId: "sc1" }),
    }));
  });
});

describe("pauseEnrollmentAction", () => {
  it("pauses active enrollment", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });

    const result = await pauseEnrollmentAction("e1");
    expect(result).toEqual({ success: true });
    expect(mockEnrollmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1" }, data: { status: "PAUSED" } }),
    );
  });

  it("throws if enrollment not found", async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    await expect(pauseEnrollmentAction("e1")).rejects.toThrow("Запись не найдена");
  });

  it("throws if not active", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "PAUSED" });
    await expect(pauseEnrollmentAction("e1")).rejects.toThrow("Можно приостановить только активное зачисление");
  });
});

describe("resumeEnrollmentAction", () => {
  it("resumes paused enrollment", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "PAUSED" });
    const result = await resumeEnrollmentAction("e1");
    expect(result).toEqual({ success: true });
    expect(mockEnrollmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "e1" }, data: { status: "ACTIVE" } }),
    );
  });

  it("throws if enrollment not found", async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null);
    await expect(resumeEnrollmentAction("e1")).rejects.toThrow("Запись не найдена");
  });

  it("throws if not paused", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    await expect(resumeEnrollmentAction("e1")).rejects.toThrow("Можно возобновить только приостановленное зачисление");
  });
});

describe("deleteEnrollmentAction", () => {
  it("deletes enrollment and curator assignment", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", userId: "u1", cohortId: "coh1" });

    const result = await deleteEnrollmentAction("e1");
    expect(result).toEqual({ success: true });
    expect(mockCuratorAssignmentDeleteMany).toHaveBeenCalled();
    expect(mockEnrollmentDelete).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("deletes enrollment without cohort", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", userId: "u1", cohortId: null });
    const result = await deleteEnrollmentAction("e1");
    expect(result).toEqual({ success: true });
    expect(mockCuratorAssignmentDeleteMany).not.toHaveBeenCalled();
  });
});

describe("createCohortAction", () => {
  it("creates cohort", async () => {
    const fd = new FormData();
    fd.set("name", "Cohort A"); fd.set("courseId", "c1");

    const result = await createCohortAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockCohortCreate).toHaveBeenCalled();
  });

  it("throws without name or courseId", async () => {
    const fd = new FormData();
    fd.set("name", "Cohort A");
    await expect(createCohortAction(fd)).rejects.toThrow("Название и курс обязательны");
  });
});

describe("updateCohortAction", () => {
  it("updates cohort", async () => {
    const fd = new FormData();
    fd.set("id", "coh1"); fd.set("name", "Updated");

    const result = await updateCohortAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockCohortUpdate).toHaveBeenCalled();
  });

  it("throws without id or name", async () => {
    const fd = new FormData();
    fd.set("name", "Cohort");
    await expect(updateCohortAction(fd)).rejects.toThrow("ID и название обязательны");
  });
});

describe("deleteCohortAction", () => {
  it("archives cohort", async () => {
    const result = await deleteCohortAction("coh1");
    expect(result).toEqual({ success: true });
    expect(mockCohortUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "coh1" }, data: { status: "archived" } }),
    );
  });
});

describe("createUserAction", () => {
  it("creates user via service", async () => {
    const fd = new FormData();
    fd.set("email", "new@test.com"); fd.set("name", "New"); fd.append("roles", "student");

    const result = await createUserAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockCreateUserFn).toHaveBeenCalled();
  });

  it("throws without email", async () => {
    const fd = new FormData();
    await expect(createUserAction(fd)).rejects.toThrow("Email обязателен");
  });
});
