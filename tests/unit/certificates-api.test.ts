import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockListCertificates = vi.hoisted(() => vi.fn());
const mockIssueCertificate = vi.hoisted(() => vi.fn());
const mockGenerateCertificatePdf = vi.hoisted(() => vi.fn());
const mockGetScopedStudentIdsForObserver = vi.hoisted(() => vi.fn());
const mockCertificateFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/observer/scope", () => ({
  getScopedStudentIdsForObserver: mockGetScopedStudentIdsForObserver,
}));
vi.mock("@/server/modules/certificates/service", () => ({
  listCertificates: mockListCertificates,
  issueCertificate: mockIssueCertificate,
  generateCertificatePdf: mockGenerateCertificatePdf,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    certificate: { findMany: mockCertificateFindMany },
  }),
}));

const certificatesRoute = await import("@/app/api/v1/certificates/route");
const bulkRoute = await import("@/app/api/v1/certificates/bulk/route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/certificates/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCertificates.mockResolvedValue([]);
  mockIssueCertificate.mockResolvedValue({ id: "issued-cert" });
  mockGenerateCertificatePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
  mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
  mockCertificateFindMany.mockResolvedValue([]);
});

describe("certificates API scope", () => {
  it("lets admin list all certificates", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });

    const response = await certificatesRoute.GET();

    expect(response.status).toBe(200);
    expect(mockListCertificates).toHaveBeenCalledWith();
    expect(mockGetScopedStudentIdsForObserver).not.toHaveBeenCalled();
  });

  it("lists only scoped certificates for customer observers", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer1", roles: ["customer_observer"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-a", "student-b"]);

    const response = await certificatesRoute.GET();

    expect(response.status).toBe(200);
    expect(mockGetScopedStudentIdsForObserver).toHaveBeenCalledWith("observer1");
    expect(mockListCertificates).toHaveBeenCalledWith({ userIds: ["student-a", "student-b"] });
  });

  it("returns an empty certificate scope for customer observers without links", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer1", roles: ["customer_observer"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue([]);

    const response = await certificatesRoute.GET();

    expect(response.status).toBe(200);
    expect(mockListCertificates).toHaveBeenCalledWith({ userIds: [] });
  });

  it("lists only the current user's certificates for non-admin roles", async () => {
    mockRequireUser.mockResolvedValue({ id: "student1", roles: ["student"] });

    const response = await certificatesRoute.GET();

    expect(response.status).toBe(200);
    expect(mockListCertificates).toHaveBeenCalledWith({ userId: "student1" });
  });

  it("scopes customer observer bulk downloads to permitted students", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer1", roles: ["customer_observer"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
    mockCertificateFindMany.mockResolvedValue([
      {
        id: "cert-allowed",
        number: "ASA-2026-ALLOW",
        userId: "student-allowed",
        courseId: "course1",
        user: { name: "Student Allowed" },
        course: { title: "Course" },
      },
    ]);

    const response = await bulkRoute.POST(
      jsonRequest({ certificateIds: ["cert-allowed", "cert-outside-scope"] }),
    );

    expect(response.status).toBe(404);
    expect(mockCertificateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["cert-allowed", "cert-outside-scope"] },
          userId: { in: ["student-allowed"] },
        },
      }),
    );
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("does not apply observer scope to admin bulk downloads", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });

    const response = await bulkRoute.POST(jsonRequest({ certificateIds: ["cert-any"] }));

    expect(response.status).toBe(404);
    expect(mockCertificateFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["cert-any"] } },
      }),
    );
    expect(mockGetScopedStudentIdsForObserver).not.toHaveBeenCalled();
  });
});
