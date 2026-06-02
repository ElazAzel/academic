import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockCertificateTemplateFindFirst = vi.hoisted(() => vi.fn());
const mockCertificateTemplateUpdate = vi.hoisted(() => vi.fn());
const mockCertificateTemplateCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    course: { findUnique: mockCourseFindUnique },
    certificateTemplate: {
      findFirst: mockCertificateTemplateFindFirst,
      update: mockCertificateTemplateUpdate,
      create: mockCertificateTemplateCreate,
    },
  }),
}));

const { getCertificateTemplateAction, saveCertificateTemplateAction } = await import("@/server/actions/certificates");

describe("certificate template actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1", userId: "instructor-1" });
    mockCourseFindUnique.mockResolvedValue({ id: "course-1", title: "Course", durationHours: 12 });
    mockCertificateTemplateFindFirst.mockResolvedValue({
      id: "template-1",
      name: "Template",
      body: { studentName: { x: 10 } },
    });
    mockCertificateTemplateUpdate.mockResolvedValue({ id: "template-1" });
    mockCertificateTemplateCreate.mockResolvedValue({ id: "template-1" });
  });

  it("loads certificate template data for an instructor-owned course", async () => {
    const result = await getCertificateTemplateAction("course-1");

    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-1", userId: "instructor-1" } },
    });
    expect(result).toEqual({
      course: { id: "course-1", title: "Course", durationHours: 12 },
      template: { id: "template-1", name: "Template", body: { studentName: { x: 10 } } },
    });
  });

  it("rejects non-object certificate template configs before auth and writes", async () => {
    await expect(saveCertificateTemplateAction("course-1", "not-object")).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });

    expect(mockRequireUser).not.toHaveBeenCalled();
    expect(mockCertificateTemplateUpdate).not.toHaveBeenCalled();
    expect(mockCertificateTemplateCreate).not.toHaveBeenCalled();
  });

  it("updates existing certificate template body and revalidates designer pages", async () => {
    await saveCertificateTemplateAction("course-1", { qrCode: { x: 20 } });

    expect(mockCertificateTemplateUpdate).toHaveBeenCalledWith({
      where: { id: "template-1" },
      data: { body: { qrCode: { x: 20 } } },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/certificates/designer/course-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/instructor/courses/course-1/certificate");
  });

  it("does not leak raw persistence errors from save action", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCertificateTemplateFindFirst.mockRejectedValue(new Error("postgres://secret-password"));

    await expect(saveCertificateTemplateAction("course-1", { qrCode: { x: 20 } })).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: expect.not.stringContaining("secret-password"),
    });

    consoleError.mockRestore();
  });
});
