import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/http";

// Mocking required session, prisma, and rate-limiting modules
const mockRequireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

const mockCertificateFindUnique = vi.hoisted(() => vi.fn());
const mockCertificateFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindFirst = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockLessonMediaFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockLessonFindMany = vi.hoisted(() => vi.fn());
const mockLessonProgressCount = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockAuditLogCount = vi.hoisted(() => vi.fn());
const mockObserverProjectFindMany = vi.hoisted(() => vi.fn());
const mockObserverCohortFindMany = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockGenerateCertificatePdf = vi.hoisted(() => vi.fn());
const mockGetSupabaseStorageSignedUrl = vi.hoisted(() => vi.fn());
const mockCreateSignedDownloadUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      findUnique: mockUserFindUnique,
    },
    certificate: {
      findUnique: mockCertificateFindUnique,
      findMany: mockCertificateFindMany,
    },
    courseInstructor: {
      findFirst: mockCourseInstructorFindFirst,
      findUnique: mockCourseInstructorFindFirst,
    },
    lesson: {
      findUnique: mockLessonFindUnique,
      findMany: mockLessonFindMany,
    },
    lessonMedia: {
      findUnique: mockLessonMediaFindUnique,
    },
    enrollment: {
      findUnique: mockEnrollmentFindUnique,
      findMany: mockEnrollmentFindMany,
    },
    lessonProgress: {
      count: mockLessonProgressCount,
    },
    auditLog: {
      create: mockAuditLogCreate,
      count: mockAuditLogCount,
    },
    observerProject: {
      findMany: mockObserverProjectFindMany,
    },
    observerCohort: {
      findMany: mockObserverCohortFindMany,
    },
    cohort: {
      findMany: mockCohortFindMany,
    },
  }),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5 }),
}));

vi.mock("@/server/modules/certificates/service", () => ({
  generateCertificatePdf: mockGenerateCertificatePdf,
}));

vi.mock("@/lib/storage", () => ({
  getSupabaseStorageSignedUrl: mockGetSupabaseStorageSignedUrl,
  createSignedDownloadUrl: mockCreateSignedDownloadUrl,
}));

// Import target API routes
import { GET as getCertificatePdf } from "@/app/api/v1/certificates/[certificateId]/pdf/route";
import { POST as postBulkCertificates } from "@/app/api/v1/certificates/bulk/route";
import { GET as getLessonMediaSignedUrl } from "@/app/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url/route";
import { GET as getLessonVideoPlayback } from "@/app/api/v1/lessons/[lessonId]/video-playback/route";
import { GET as getCourseBuilder, PATCH as patchCourseBuilder } from "@/app/api/v1/courses/[courseId]/builder/route";

describe("Platform Negative Security Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure default resolved values for safety
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
    mockAuditLogCount.mockResolvedValue(0);
    mockUserFindUnique.mockResolvedValue({ id: "admin", roles: [{ role: { key: "admin" } }] });
    mockObserverProjectFindMany.mockResolvedValue([]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([]);
    mockEnrollmentFindMany.mockResolvedValue([]);
    mockGenerateCertificatePdf.mockResolvedValue(Buffer.from("%PDF-mock-data"));
    mockGetSupabaseStorageSignedUrl.mockResolvedValue("https://storage.example/signed");
    mockCreateSignedDownloadUrl.mockResolvedValue("https://s3.example/signed");
  });

  describe("Certificate Access Hardening", () => {
    it("requires certificate read permission before PDF lookup", async () => {
      mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

      const response = await getCertificatePdf(new Request("http://localhost"), {
        params: Promise.resolve({ certificateId: "cert-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("forbidden");
      expect(mockRequireUser).toHaveBeenCalledWith("certificates:read");
      expect(mockCertificateFindUnique).not.toHaveBeenCalled();
      expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
    });

    it("returns 403 Forbidden when trying to download a revoked certificate", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockCertificateFindUnique.mockResolvedValue({
        userId: "student-1",
        courseId: "course-1",
        number: "CERT-001",
        revokedAt: new Date(),
        user: { name: "Test Student" },
        course: { title: "Test Course" },
      });

      const response = await getCertificatePdf(new Request("http://localhost"), {
        params: Promise.resolve({ certificateId: "cert-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("отозван");
    });

    it("returns 403 Forbidden when trying to download another student's certificate (guessed ID protection)", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-2", email: "other@test.com", roles: ["student"] });
      mockCertificateFindUnique.mockResolvedValue({
        userId: "student-1",
        courseId: "course-1",
        number: "CERT-001",
        revokedAt: null,
        user: { name: "Test Student" },
        course: { title: "Test Course" },
      });
      mockCourseInstructorFindFirst.mockResolvedValue(null);

      const response = await getCertificatePdf(new Request("http://localhost"), {
        params: Promise.resolve({ certificateId: "cert-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("Нет доступа");
    });

    it("excludes revoked certificates from bulk downloads", async () => {
      mockRequireUser.mockResolvedValue({ id: "observer-1", email: "observer@test.com", roles: ["customer_observer"] });
      
      // Mock findMany query only returning 1 cert because the other is filtered by revokedAt: null
      mockCertificateFindMany.mockResolvedValue([
        {
          id: "cert-1",
          number: "CERT-001",
          userId: "student-1",
          courseId: "course-1",
          user: { name: "Test Student" },
          course: { title: "Test Course" },
        },
      ]);

      const req = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ certificateIds: ["cert-1", "cert-revoked"] }),
      });

      const response = await postBulkCertificates(req);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.message).toContain("не найдены");
    });

    it("lets a customer observer download a certificate for a scoped student", async () => {
      mockRequireUser.mockResolvedValue({ id: "observer-1", email: "observer@test.com", roles: ["customer_observer"] });
      mockCertificateFindUnique.mockResolvedValue({
        userId: "student-1",
        courseId: "course-1",
        number: "CERT-001",
        revokedAt: null,
        user: { name: "Test Student" },
        course: { title: "Test Course" },
      });
      mockObserverCohortFindMany.mockResolvedValue([{ cohortId: "cohort-1" }]);
      mockEnrollmentFindMany.mockResolvedValue([{ userId: "student-1" }]);

      const response = await getCertificatePdf(new Request("http://localhost"), {
        params: Promise.resolve({ certificateId: "cert-1" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(mockGenerateCertificatePdf).toHaveBeenCalledWith("cert-1");
    });

    it("blocks a customer observer from downloading a certificate outside their scope", async () => {
      mockRequireUser.mockResolvedValue({ id: "observer-1", email: "observer@test.com", roles: ["customer_observer"] });
      mockCertificateFindUnique.mockResolvedValue({
        userId: "student-outside",
        courseId: "course-1",
        number: "CERT-001",
        revokedAt: null,
        user: { name: "Outside Student" },
        course: { title: "Test Course" },
      });
      mockObserverCohortFindMany.mockResolvedValue([{ cohortId: "cohort-1" }]);
      mockEnrollmentFindMany.mockResolvedValue([{ userId: "student-allowed" }]);

      const response = await getCertificatePdf(new Request("http://localhost"), {
        params: Promise.resolve({ certificateId: "cert-outside" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("Нет доступа");
      expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
    });
  });

  describe("Gated Lesson & Video Access", () => {
    it("returns 403 Forbidden if student has no active enrollment for the course", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "open" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue(null);

      const response = await getLessonVideoPlayback(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("Нет доступа к этому уроку");
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "security.forbidden_media_access",
          metadata: expect.objectContaining({
            lessonId: "lesson-1",
            reason: "Нет активного зачисления",
          }),
        }),
      });
    });

    it("enforces sequential lock when previous required lessons are not completed", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-2",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "sequential" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });

      mockLessonFindMany.mockResolvedValue([
        { id: "lesson-1", isRequired: true },
        { id: "lesson-2", isRequired: true },
      ]);

      mockLessonProgressCount.mockResolvedValue(0);

      const response = await getLessonVideoPlayback(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-2" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("обязательные уроки");
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "security.locked_lesson_access_attempt",
          metadata: expect.objectContaining({
            courseId: "course-1",
            reason: "Последовательная блокировка: предыдущие обязательные уроки не завершены",
          }),
        }),
      });
    });
  });

  describe("Lesson Media Signed URL Privacy", () => {
    it("returns 403 Forbidden if student requests media without active course enrollment", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "open" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue(null);

      const response = await getLessonMediaSignedUrl(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-1", mediaId: "media-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("forbidden");
      expect(mockLessonMediaFindUnique).not.toHaveBeenCalled();
    });

    it("returns 403 Forbidden for media in a sequentially locked lesson", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-2",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "sequential" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
      mockLessonFindMany.mockResolvedValue([
        { id: "lesson-1", isRequired: true },
        { id: "lesson-2", isRequired: true },
      ]);
      mockLessonProgressCount.mockResolvedValue(0);

      const response = await getLessonMediaSignedUrl(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-2", mediaId: "media-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("forbidden");
      expect(mockLessonMediaFindUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when a student guesses a media ID from another lesson", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "open" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
      mockLessonMediaFindUnique.mockResolvedValue({
        id: "media-foreign",
        lessonId: "lesson-foreign",
        storageKey: "lessons/foreign.pdf",
        url: null,
        filename: "foreign.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      });

      const response = await getLessonMediaSignedUrl(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-1", mediaId: "media-foreign" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("not_found");
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "security.forbidden_media_access",
          metadata: expect.objectContaining({
            lessonId: "lesson-1",
            reason: "Файл не относится к этому уроку",
          }),
        }),
      });
    });

    it("does not fall back to a public media URL when managed storage signing fails", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "open" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
      mockLessonMediaFindUnique.mockResolvedValue({
        id: "media-1",
        lessonId: "lesson-1",
        storageKey: "lesson-media/private.pdf",
        url: "https://storage.example/public/lesson-media/private.pdf",
        filename: "private.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      });
      mockGetSupabaseStorageSignedUrl.mockResolvedValue(null);
      mockCreateSignedDownloadUrl.mockResolvedValue(null);

      const response = await getLessonMediaSignedUrl(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-1", mediaId: "media-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe("service_unavailable");
      expect(data).not.toMatchObject({
        data: expect.objectContaining({
          url: "https://storage.example/public/lesson-media/private.pdf",
        }),
      });
      expect(mockAuditLogCreate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: "lesson.file_signed_url_issued",
        }),
      );
    });

    it("allows legacy external media URLs only when no storage key is present", async () => {
      mockRequireUser.mockResolvedValue({ id: "student-1", email: "student@test.com", roles: ["student"] });
      mockLessonFindUnique.mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        module: {
          id: "module-1",
          courseId: "course-1",
          course: { traversalMode: "open" },
        },
      });
      mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
      mockLessonMediaFindUnique.mockResolvedValue({
        id: "media-legacy",
        lessonId: "lesson-1",
        storageKey: null,
        url: "https://cdn.example.com/public-guide.pdf",
        filename: "public-guide.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      });

      const response = await getLessonMediaSignedUrl(new Request("http://localhost"), {
        params: Promise.resolve({ lessonId: "lesson-1", mediaId: "media-legacy" }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.url).toBe("https://cdn.example.com/public-guide.pdf");
      expect(mockGetSupabaseStorageSignedUrl).not.toHaveBeenCalled();
      expect(mockCreateSignedDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe("Customer Observer Strict Gating", () => {
    it("returns 403 Forbidden when a Customer Observer attempts to modify course curriculum", async () => {
      mockRequireUser.mockImplementation(async (permission) => {
        if (permission === "courses:write") {
          const { ApiError } = await import("@/lib/http");
          throw new ApiError("forbidden", "Недостаточно прав", 403);
        }
        return { id: "obs-1", email: "obs@test.com", roles: ["customer_observer"] };
      });

      const req = new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Malicious Course Update",
          traversalMode: "open",
        }),
      });

      const response = await patchCourseBuilder(req, {
        params: Promise.resolve({ courseId: "course-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain("Недостаточно прав");
    });
  });

  describe("Instructor Course Scope Boundaries", () => {
    it("returns 403 Forbidden when an instructor tries to modify a course they do not teach", async () => {
      mockRequireUser.mockResolvedValue({ id: "instructor-1", email: "instructor@test.com", roles: ["instructor"] });
      mockUserFindUnique.mockResolvedValue({ id: "instructor-1", roles: [{ role: { key: "instructor" } }], courseInstructors: [] });
      mockCourseInstructorFindFirst.mockResolvedValue(null);

      const req = new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Unauthorized Course Edit",
        }),
      });

      const response = await patchCourseBuilder(req, {
        params: Promise.resolve({ courseId: "course-not-mine" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("forbidden");
      expect(data.error.message).toContain("преподавателем");
    });

    it("returns 403 Forbidden when an instructor tries to read a course builder for a course they do not teach", async () => {
      mockRequireUser.mockResolvedValue({ id: "instructor-2", email: "instructor2@test.com", roles: ["instructor"] });
      mockUserFindUnique.mockResolvedValue({ id: "instructor-2", roles: [{ role: { key: "instructor" } }], courseInstructors: [] });
      mockCourseInstructorFindFirst.mockResolvedValue(null);

      const response = await getCourseBuilder(new Request("http://localhost"), {
        params: Promise.resolve({ courseId: "course-not-mine" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("forbidden");
    });
  });
});
