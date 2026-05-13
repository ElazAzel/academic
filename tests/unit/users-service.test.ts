import { RoleKey } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockUserCreate = vi.hoisted(() => vi.fn());
const mockRoleFindMany = vi.hoisted(() => vi.fn());
const mockUserRoleDeleteMany = vi.hoisted(() => vi.fn());
const mockUserRoleCreateMany = vi.hoisted(() => vi.fn());
const mock$transaction = vi.hoisted(() => vi.fn(async (arg: unknown) => {
  if (Array.isArray(arg)) return Promise.all(arg);
  if (typeof arg === "function") return (arg as () => unknown)();
}));
const mockAuditLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
      findUniqueOrThrow: mockUserFindUniqueOrThrow,
      create: mockUserCreate,
    },
    role: { findMany: mockRoleFindMany },
    userRole: {
      deleteMany: mockUserRoleDeleteMany,
      createMany: mockUserRoleCreateMany,
    },
    $transaction: mock$transaction,
    auditLog: { create: mockAuditLogCreate },
  }),
}));

const { getAssignableRolesForActor, listUsers, setUserRoles, createUser } = await import("@/server/modules/users/service");

describe("getAssignableRolesForActor", () => {
  it("admin can assign all roles", () => {
    const result = getAssignableRolesForActor([RoleKey.admin]);
    expect(result).toContain(RoleKey.admin);
    expect(result).toContain(RoleKey.student);
    expect(result).toContain(RoleKey.super_curator);
    expect(result.length).toBeGreaterThan(3);
  });

  it("super_curator has limited assignable roles", () => {
    const result = getAssignableRolesForActor([RoleKey.super_curator]);
    expect(result).toContain(RoleKey.student);
    expect(result).toContain(RoleKey.curator);
    expect(result).toContain(RoleKey.instructor);
    expect(result).toContain(RoleKey.customer_observer);
    expect(result).not.toContain(RoleKey.admin);
    expect(result).not.toContain(RoleKey.super_curator);
  });

  it("regular user cannot assign any roles", () => {
    const result = getAssignableRolesForActor([RoleKey.student]);
    expect(result).toEqual([]);
  });
});

describe("listUsers", () => {
  it("returns users with filters", async () => {
    mockUserFindMany.mockResolvedValue([
      { id: "u1", email: "a@test.com", name: "Alice", status: "ACTIVE", lastLoginAt: null, roles: [] },
    ]);

    const result = await listUsers({ roleKeys: [RoleKey.student], take: 10, skip: 0 });
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("a@test.com");
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roles: { some: { role: { key: { in: [RoleKey.student] } } } } },
        take: 10,
        skip: 0,
      }),
    );
  });

  it("caps take at 500", async () => {
    mockUserFindMany.mockResolvedValue([]);

    await listUsers({ take: 1000 });
    expect(mockUserFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
  });

  it("returns empty array when no users match", async () => {
    mockUserFindMany.mockResolvedValue([]);

    const result = await listUsers({ roleKeys: [RoleKey.admin] });
    expect(result).toEqual([]);
  });
});

describe("setUserRoles", () => {
  const adminActor = { id: "admin1", email: "admin@test.com", roles: [RoleKey.admin] };

  it("assigns roles correctly for admin", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "target1" });
    mockRoleFindMany.mockResolvedValue([
      { id: "r1", key: RoleKey.student },
      { id: "r2", key: RoleKey.instructor },
    ]);
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: "target1",
      email: "t@test.com",
      name: "Target",
      status: "ACTIVE",
      lastLoginAt: null,
      roles: [
        { role: { id: "r1", key: RoleKey.student, name: "Student", description: null, color: null, permissions: null, sortOrder: 0 } },
      ],
    });

    const result = await setUserRoles(adminActor, "target1", [RoleKey.student, RoleKey.instructor]);
    expect(result.id).toBe("target1");
    expect(mockUserRoleDeleteMany).toHaveBeenCalledWith({ where: { userId: "target1" } });
    expect(mockUserRoleCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "target1" }),
        ]),
      }),
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it("throws 403 when actor has insufficient rights", async () => {
    const studentActor = { id: "student1", email: "student@test.com", roles: [RoleKey.student] };

    await expect(setUserRoles(studentActor, "target1", [RoleKey.student])).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("throws 403 when trying to assign forbidden roles", async () => {
    const curatorActor = { id: "curator1", email: "curator@test.com", roles: [RoleKey.super_curator] };

    await expect(setUserRoles(curatorActor, "target1", [RoleKey.admin])).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

describe("createUser", () => {
  const adminActor = { id: "admin1", email: "admin@test.com", roles: [RoleKey.admin] };

  it("creates user with roles", async () => {
    mockUserFindUnique.mockResolvedValueOnce(null);
    mockRoleFindMany.mockResolvedValue([{ id: "r1", key: RoleKey.student }]);
    mockUserCreate.mockResolvedValue({
      id: "new1",
      email: "new@test.com",
      name: "New User",
      status: "ACTIVE",
      lastLoginAt: null,
      roles: [{ role: { id: "r1", key: RoleKey.student, name: "Student", description: null, color: null, permissions: null, sortOrder: 0 } }],
    });

    const result = await createUser(adminActor, { email: "new@test.com", name: "New User", roleKeys: [RoleKey.student] });
    expect(result.id).toBe("new1");
    expect(result.email).toBe("new@test.com");
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it("throws 400 when user with email already exists", async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: "existing1", email: "dup@test.com" });

    await expect(createUser(adminActor, { email: "dup@test.com", roleKeys: [RoleKey.student] })).rejects.toMatchObject({ code: "bad_request", status: 400 });
  });

  it("throws 403 when actor lacks permission", async () => {
    const studentActor = { id: "student1", email: "student@test.com", roles: [RoleKey.student] };

    await expect(createUser(studentActor, { email: "new@test.com", roleKeys: [RoleKey.student] })).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});
