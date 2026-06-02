import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetScormLessonCourseId = vi.hoisted(() => vi.fn());
const mockAssertInstructorOfCourse = vi.hoisted(() => vi.fn());
const mockImportScormPackage = vi.hoisted(() => vi.fn());
const mockDeleteScormDirectory = vi.hoisted(() => vi.fn());
const mockScormPackageFindUnique = vi.hoisted(() => vi.fn());
const mockScormPackageDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/scorm/service", () => ({ getScormLessonCourseId: mockGetScormLessonCourseId }));
vi.mock("@/server/modules/courses/service", () => ({ assertInstructorOfCourse: mockAssertInstructorOfCourse }));
vi.mock("@/server/modules/scorm/import", () => ({ importScormPackage: mockImportScormPackage }));
vi.mock("@/server/modules/scorm/storage", () => ({ deleteScormDirectory: mockDeleteScormDirectory }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    scormPackage: {
      findUnique: mockScormPackageFindUnique,
      delete: mockScormPackageDelete,
    },
  }),
}));

const importRoute = await import("@/app/api/v1/lessons/[lessonId]/scorm/import/route");
const packageRoute = await import("@/app/api/v1/lessons/[lessonId]/scorm/package/route");

function context(lessonId = "lesson-1") {
  return { params: Promise.resolve({ lessonId }) };
}

function multipartRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.set("file", file);
  return new Request("http://localhost/api/v1/lessons/lesson-1/scorm/import", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
  mockGetScormLessonCourseId.mockResolvedValue("course-1");
  mockAssertInstructorOfCourse.mockResolvedValue(undefined);
  mockImportScormPackage.mockResolvedValue({
    id: "package-1",
    entryUrl: "/api/v1/scorm/serve/package-1/index.html",
  });
  mockScormPackageFindUnique.mockResolvedValue({
    id: "package-1",
    title: "SCORM",
    scormVersion: "1.2",
    manifest: { organizations: [{ identifier: "org-1", title: "Курс" }] },
    entryUrl: "/api/v1/scorm/serve/package-1/index.html",
  });
  mockScormPackageDelete.mockResolvedValue({});
  mockDeleteScormDirectory.mockResolvedValue(undefined);
});

describe("SCORM package management API", () => {
  it("checks instructor course scope before importing a package", async () => {
    mockAssertInstructorOfCourse.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await importRoute.POST(
      multipartRequest(new File([new Uint8Array([1, 2])], "pkg.zip", { type: "application/zip" })),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockGetScormLessonCourseId).toHaveBeenCalledWith("lesson-1");
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockImportScormPackage).not.toHaveBeenCalled();
  });

  it("returns structured bad_request when no import file is provided", async () => {
    const response = await importRoute.POST(multipartRequest(), context());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockImportScormPackage).not.toHaveBeenCalled();
  });

  it("imports a package only after course scope is confirmed", async () => {
    const response = await importRoute.POST(
      multipartRequest(new File([new Uint8Array([1, 2, 3])], "pkg.zip", { type: "application/zip" })),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("package-1");
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockImportScormPackage).toHaveBeenCalledWith("lesson-1", Buffer.from([1, 2, 3]));
  });

  it("checks instructor course scope before reading package metadata", async () => {
    mockAssertInstructorOfCourse.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await packageRoute.GET(
      new Request("http://localhost/api/v1/lessons/lesson-1/scorm/package"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockScormPackageFindUnique).not.toHaveBeenCalled();
  });

  it("deletes package storage and metadata only after course scope is confirmed", async () => {
    const response = await packageRoute.DELETE(
      new Request("http://localhost/api/v1/lessons/lesson-1/scorm/package", { method: "DELETE" }),
      context(),
    );

    expect(response.status).toBe(204);
    expect(mockScormPackageFindUnique).toHaveBeenCalledWith({ where: { lessonId: "lesson-1" } });
    expect(mockDeleteScormDirectory).toHaveBeenCalledWith("package-1");
    expect(mockScormPackageDelete).toHaveBeenCalledWith({ where: { id: "package-1" } });
  });
});
