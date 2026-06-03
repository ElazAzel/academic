import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerificationTokenCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    verificationToken: { create: mockVerificationTokenCreate },
    user: { findUnique: mockUserFindUnique },
    auditLog: { create: mockAuditLogCreate },
  }),
}));

vi.mock("@/server/modules/notifications/service", () => ({
  createNotification: vi.fn(),
  sendEmail: mockSendEmail,
}));

const { requestPasswordReset } = await import("@/server/modules/auth/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({ id: "student-1", email: "student@academy.local" });
  mockVerificationTokenCreate.mockResolvedValue({ token: "reset-token" });
  mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
});

describe("password reset safe logging", () => {
  it("does not log recipient email or raw email provider errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSendEmail.mockRejectedValueOnce(new Error("smtp://secret-reset-provider"));

    const result = await requestPasswordReset("Student@Academy.Local");

    const serializedCalls = JSON.stringify(consoleError.mock.calls);
    expect(result).toEqual({ accepted: true });
    expect(serializedCalls).not.toContain("student@academy.local");
    expect(serializedCalls).not.toContain("secret-reset-provider");
    expect(consoleError).toHaveBeenCalledWith(
      "[Auth] Failed to send password reset email",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
