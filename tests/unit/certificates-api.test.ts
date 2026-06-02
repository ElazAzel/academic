import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockListCertificates = vi.hoisted(() => vi.fn());
const mockIssueCertificate = vi.hoisted(() => vi.fn());
const mockClaimCertificateForCourse = vi.hoisted(() => vi.fn());
const mockGenerateCertificatePdf = vi.hoisted(() => vi.fn());
const mockVerifyCertificateByCode = vi.hoisted(() => vi.fn());
const mockRevokeCertificate = vi.hoisted(() => vi.fn());
const mockGetScopedStudentIdsForObserver = vi.hoisted(() => vi.fn());
const mockCertificateFindMany = vi.hoisted(() => vi.fn());
const mockCertificateFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindFirst = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/observer/scope", () => ({
  getScopedStudentIdsForObserver: mockGetScopedStudentIdsForObserver,
}));
vi.mock("@/server/modules/certificates/service", () => ({
  listCertificates: mockListCertificates,
  issueCertificate: mockIssueCertificate,
  claimCertificateForCourse: mockClaimCertificateForCourse,
  generateCertificatePdf: mockGenerateCertificatePdf,
  verifyCertificateByCode: mockVerifyCertificateByCode,
  revokeCertificate: mockRevokeCertificate,
}));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    certificate: { findMany: mockCertificateFindMany, findUnique: mockCertificateFindUnique },
    courseInstructor: { findFirst: mockCourseInstructorFindFirst },
  }),
}));

const certificatesRoute = await import("@/app/api/v1/certificates/route");
const claimRoute = await import("@/app/api/v1/certificates/claim/route");
const bulkRoute = await import("@/app/api/v1/certificates/bulk/route");
const verifyRoute = await import("@/app/api/v1/certificates/verify/[verificationCode]/route");
const certificateRoute = await import("@/app/api/v1/certificates/[certificateId]/route");
const certificatePdfRoute = await import("@/app/api/v1/certificates/[certificateId]/pdf/route");

function jsonRequest(body: unknown, url = "http://localhost/api/v1/certificates/bulk") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function certificateContext(certificateId = "cert-1") {
  return { params: Promise.resolve({ certificateId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCertificates.mockResolvedValue([]);
  mockIssueCertificate.mockResolvedValue({ id: "issued-cert" });
  mockClaimCertificateForCourse.mockResolvedValue({ certificate: { id: "issued-cert" }, alreadyIssued: false });
  mockGenerateCertificatePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
  mockVerifyCertificateByCode.mockResolvedValue(null);
  mockRevokeCertificate.mockResolvedValue({ id: "cert-1", revokedAt: new Date("2026-05-21T00:00:00.000Z") });
  mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
  mockCertificateFindMany.mockResolvedValue([]);
  mockCertificateFindUnique.mockResolvedValue({
    userId: "student-owner",
    courseId: "course-1",
    number: "ASA-2026-001",
    revokedAt: null,
    user: { name: "Student Owner" },
    course: { title: "Course" },
  });
  mockCourseInstructorFindFirst.mockResolvedValue(null);
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
});

describe("certificates API scope", () => {
  it("requires certificate read permission before listing certificates", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await certificatesRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:read");
    expect(mockListCertificates).not.toHaveBeenCalled();
    expect(mockGetScopedStudentIdsForObserver).not.toHaveBeenCalled();
  });

  it("lets admin list all certificates", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });

    const response = await certificatesRoute.GET();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:read");
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

  it("lets a student claim their own eligible certificate", async () => {
    mockRequireUser.mockResolvedValue({ id: "student1", roles: ["student"] });

    const response = await claimRoute.POST(
      jsonRequest({ courseId: "course1" }, "http://localhost/api/v1/certificates/claim"),
    );

    expect(response.status).toBe(201);
    expect(mockClaimCertificateForCourse).toHaveBeenCalledWith("student1", "course1");
  });

  it("returns existing own certificate claim idempotently", async () => {
    mockRequireUser.mockResolvedValue({ id: "student1", roles: ["student"] });
    mockClaimCertificateForCourse.mockResolvedValue({
      certificate: { id: "existing-cert" },
      alreadyIssued: true,
    });

    const response = await claimRoute.POST(
      jsonRequest({ courseId: "course1" }, "http://localhost/api/v1/certificates/claim"),
    );

    expect(response.status).toBe(200);
    expect(mockClaimCertificateForCourse).toHaveBeenCalledWith("student1", "course1");
  });

  it("does not let non-student roles use the self-claim endpoint", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });

    const response = await claimRoute.POST(
      jsonRequest({ courseId: "course1" }, "http://localhost/api/v1/certificates/claim"),
    );

    expect(response.status).toBe(403);
    expect(mockClaimCertificateForCourse).not.toHaveBeenCalled();
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
          revokedAt: null,
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
        where: { id: { in: ["cert-any"] }, revokedAt: null },
      }),
    );
    expect(mockGetScopedStudentIdsForObserver).not.toHaveBeenCalled();
  });

  it("rejects bulk download when rate limited", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await bulkRoute.POST(jsonRequest({ certificateIds: ["cert-1"] }));

    expect(response.status).toBe(429);
    expect(mockCertificateFindMany).not.toHaveBeenCalled();
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("requires certificate read permission before bulk downloads", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await bulkRoute.POST(jsonRequest({ certificateIds: ["cert-1"] }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:read");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockCertificateFindMany).not.toHaveBeenCalled();
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("requires certificate read permission before rendering certificate PDFs", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:read");
    expect(mockCertificateFindUnique).not.toHaveBeenCalled();
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("denies certificate PDF downloads for another student before rendering", async () => {
    mockRequireUser.mockResolvedValue({ id: "student-other", roles: ["student"] });

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockCourseInstructorFindFirst).not.toHaveBeenCalled();
    expect(mockGetScopedStudentIdsForObserver).not.toHaveBeenCalled();
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("denies customer observer certificate PDFs outside scoped students", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer1", roles: ["customer_observer"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-other"]);

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockGetScopedStudentIdsForObserver).toHaveBeenCalledWith("observer1");
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("lets customer observers render certificate PDFs only for scoped students", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer1", roles: ["customer_observer"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-owner"]);

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(mockGetScopedStudentIdsForObserver).toHaveBeenCalledWith("observer1");
    expect(mockGenerateCertificatePdf).toHaveBeenCalledWith("cert-1");
  });

  it("lets assigned instructors render certificate PDFs for their courses", async () => {
    mockRequireUser.mockResolvedValue({ id: "instructor1", roles: ["instructor"] });
    mockCourseInstructorFindFirst.mockResolvedValue({ id: "link-1" });

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );

    expect(response.status).toBe(200);
    expect(mockCourseInstructorFindFirst).toHaveBeenCalledWith({
      where: { courseId: "course-1", userId: "instructor1" },
    });
    expect(mockGenerateCertificatePdf).toHaveBeenCalledWith("cert-1");
  });

  it("does not render revoked certificate PDFs", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });
    mockCertificateFindUnique.mockResolvedValue({
      userId: "student-owner",
      courseId: "course-1",
      number: "ASA-2026-001",
      revokedAt: new Date("2026-05-21T00:00:00.000Z"),
      user: { name: "Student Owner" },
      course: { title: "Course" },
    });

    const response = await certificatePdfRoute.GET(
      new Request("http://localhost/api/v1/certificates/cert-1/pdf"),
      certificateContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown public certificate verification codes", async () => {
    mockVerifyCertificateByCode.mockResolvedValue(null);

    const response = await verifyRoute.GET(
      new Request("http://localhost/api/v1/certificates/verify/missing-code"),
      { params: Promise.resolve({ verificationCode: "missing-code" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(mockVerifyCertificateByCode).toHaveBeenCalledWith("missing-code");
    expect(mockRequireUser).not.toHaveBeenCalled();
  });

  it("returns public certificate verification payload without requiring auth", async () => {
    const issuedAt = new Date("2026-05-20T00:00:00.000Z");
    mockVerifyCertificateByCode.mockResolvedValue({
      valid: true,
      number: "ASA-2026-PUBLIC",
      verificationCode: "valid-code",
      verificationUrl: "https://academy.local/certificates/verify/valid-code",
      studentName: "Иван Иванов",
      courseTitle: "Стратегия AI",
      durationHours: 24,
      issuedAt,
      revokedAt: null,
    });

    const response = await verifyRoute.GET(
      new Request("http://localhost/api/v1/certificates/verify/valid-code"),
      { params: Promise.resolve({ verificationCode: "valid-code" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      valid: true,
      number: "ASA-2026-PUBLIC",
      verificationCode: "valid-code",
      verificationUrl: "https://academy.local/certificates/verify/valid-code",
      studentName: "Иван Иванов",
      courseTitle: "Стратегия AI",
      durationHours: 24,
      issuedAt: issuedAt.toISOString(),
      revokedAt: null,
    });
    expect(body.data).not.toHaveProperty("userId");
    expect(body.data).not.toHaveProperty("courseId");
    expect(body.data).not.toHaveProperty("email");
    expect(mockRequireUser).not.toHaveBeenCalled();
  });

  it("requires certificate issue permission before revoking certificates", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await certificateRoute.DELETE(
      new Request("http://localhost/api/v1/certificates/cert-1", { method: "DELETE" }),
      { params: Promise.resolve({ certificateId: "cert-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:issue");
    expect(mockRevokeCertificate).not.toHaveBeenCalled();
  });

  it("revokes certificates through the service for authorized actors", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin1", roles: ["admin"] });

    const response = await certificateRoute.DELETE(
      new Request("http://localhost/api/v1/certificates/cert-1", { method: "DELETE" }),
      { params: Promise.resolve({ certificateId: "cert-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      id: "cert-1",
      revokedAt: "2026-05-21T00:00:00.000Z",
    });
    expect(mockRequireUser).toHaveBeenCalledWith("certificates:issue");
    expect(mockRevokeCertificate).toHaveBeenCalledWith("cert-1", "admin1");
  });
});
