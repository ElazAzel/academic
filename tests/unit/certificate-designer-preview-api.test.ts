import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindFirst = vi.hoisted(() => vi.fn());
const mockGenerateDraftCertificatePdf = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    courseInstructor: { findFirst: mockCourseInstructorFindFirst },
  }),
}));

vi.mock("@/server/modules/certificates/service", () => ({
  generateDraftCertificatePdf: mockGenerateDraftCertificatePdf,
}));

const previewRoute = await import("@/app/api/v1/certificates/designer/[courseId]/preview/route");

function previewRequest(body: unknown = {}) {
  return new Request("http://localhost/api/v1/certificates/designer/course-1/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawPreviewRequest(body: string) {
  return new Request("http://localhost/api/v1/certificates/designer/course-1/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("certificate designer preview API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockCourseInstructorFindFirst.mockResolvedValue({ courseId: "course-1", userId: "instructor-1" });
    mockGenerateDraftCertificatePdf.mockResolvedValue(Buffer.from("%PDF-preview"));
  });

  it("requires course write permission before rendering a certificate preview", async () => {
    const response = await previewRoute.POST(previewRequest({ title: "Сертификат" }), {
      params: Promise.resolve({ courseId: "course-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockGenerateDraftCertificatePdf).toHaveBeenCalledWith("course-1", { title: "Сертификат" });
  });

  it("does not hit DB or PDF generation when course write permission is missing", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await previewRoute.POST(previewRequest({ title: "Сертификат" }), {
      params: Promise.resolve({ courseId: "course-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockCourseInstructorFindFirst).not.toHaveBeenCalled();
    expect(mockGenerateDraftCertificatePdf).not.toHaveBeenCalled();
  });

  it("denies instructors who do not teach the course", async () => {
    mockCourseInstructorFindFirst.mockResolvedValue(null);

    const response = await previewRoute.POST(previewRequest({ title: "Сертификат" }), {
      params: Promise.resolve({ courseId: "course-foreign" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.message).toContain("Нет доступа");
    expect(mockGenerateDraftCertificatePdf).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON before rendering a certificate preview", async () => {
    const response = await previewRoute.POST(rawPreviewRequest("{"), {
      params: Promise.resolve({ courseId: "course-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockGenerateDraftCertificatePdf).not.toHaveBeenCalled();
  });

  it("rejects non-object preview payloads before rendering a certificate preview", async () => {
    const response = await previewRoute.POST(previewRequest([]), {
      params: Promise.resolve({ courseId: "course-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockGenerateDraftCertificatePdf).not.toHaveBeenCalled();
  });
});
