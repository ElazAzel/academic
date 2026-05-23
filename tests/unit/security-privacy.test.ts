import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mocking required session, prisma, and rate-limiting modules
const mockRequireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

const mockCertificateFindUnique = vi.hoisted(() => vi.fn());
const mockCertificateFindMany = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindFirst = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockLessonFindMany = vi.hoisted(() => vi.fn());
const mockLessonProgressCount = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockObserverProjectFindMany = vi.hoisted(() => vi.fn());
const mockObserverCohortFindMany = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    certificate: {
      findUnique: mockCertificateFindUnique,
      findMany: mockCertificateFindMany,
    },
    courseInstructor: {
      findFirst: mockCourseInstructorFindFirst,
    },
    lesson: {
      findUnique: mockLessonFindUnique,
      findMany: mockLessonFindMany,
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
  generateCertificatePdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-mock-data")),
}));

// Import target API routes
import { GET as getCertificatePdf } from "@/app/api/v1/certificates/[certificateId]/pdf/route";
import { POST as postBulkCertificates } from "@/app/api/v1/certificates/bulk/route";
import { GET as getLessonVideoPlayback } from "@/app/api/v1/lessons/[lessonId]/video-playback/route";
import { PATCH as patchCourseBuilder } from "@/app/api/v1/courses/[courseId]/builder/route";

describe("Platform Negative Security Boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configure default resolved values for safety
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
    mockObserverProjectFindMany.mockResolvedValue([]);
    mockObserverCohortFindMany.mockResolvedValue([]);
    mockCohortFindMany.mockResolvedValue([]);
    mockEnrollmentFindMany.mockResolvedValue([]);
  });

  describe("Certificate Access Hardening", () => {
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
  });

  describe("Gated Lesson & Video Access", () => {
    it("returns 403 / error if student has no active enrollment for the course", async () => {
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

      expect(response.status).toBe(500);
      expect(data.error.message).toContain("Нет доступа к этому уроку");
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

      expect(response.status).toBe(500);
      expect(data.error.message).toContain("обязательные уроки");
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
});
