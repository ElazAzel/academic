import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockInviteLinkCreate = vi.hoisted(() => vi.fn());
const mockInviteLinkDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/server/modules/audit/service", () => ({ logAudit: mockLogAudit }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    inviteLink: { create: mockInviteLinkCreate, delete: mockInviteLinkDelete },
  }),
}));

const { createInviteAction, deleteInviteAction } = await import("@/server/actions/invites");

const adminUser = { id: "admin1", email: "admin@test.com", name: "Admin", roles: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(adminUser);
  mockInviteLinkCreate.mockResolvedValue({ id: "inv1", token: "ABC123" });
});

describe("createInviteAction", () => {
  it("creates invite with all fields", async () => {
    const fd = new FormData();
    fd.set("courseId", "c1");
    fd.set("cohortId", "coh1");
    fd.set("maxActivations", "5");
    fd.set("expiresAt", "2027-01-01");
    fd.set("allowedEmails", "a@test.com\nb@test.com");

    const result = await createInviteAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockInviteLinkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token: expect.any(String),
          courseId: "c1",
          cohortId: "coh1",
          maxActivations: 5,
        }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "invite.created" }));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/invites");
  });

  it("creates invite with minimal fields", async () => {
    const fd = new FormData();

    const result = await createInviteAction(fd);
    expect(result).toEqual({ success: true });
    expect(mockInviteLinkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          maxActivations: 1,
          courseId: undefined,
          cohortId: undefined,
          allowedEmails: [],
        }),
      }),
    );
  });
});

describe("deleteInviteAction", () => {
  it("deletes invite and logs audit", async () => {
    const result = await deleteInviteAction("inv1");
    expect(result).toEqual({ success: true });
    expect(mockInviteLinkDelete).toHaveBeenCalledWith({ where: { id: "inv1" } });
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "invite.deleted" }));
  });

  it("throws on error", async () => {
    const err = new Error("Not found");
    mockInviteLinkDelete.mockRejectedValue(err);
    await expect(deleteInviteAction("bad-id")).rejects.toThrow("Not found");
  });
});
