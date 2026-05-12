import { describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockAuditCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    assignment: { findUnique: mockFindUnique },
    enrollment: { findUnique: mockEnrollmentFindUnique },
    assignmentSubmission: { count: mockCount, create: mockCreate, update: mockUpdate },
    auditLog: { create: mockAuditCreate },
  }),
}));

const { submitAssignment, reviewSubmission } = await import("@/server/modules/assignments/service");

describe("submitAssignment", () => {
  it("throws 404 when assignment does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      submitAssignment({ assignmentId: "missing", userId: "u1", answerText: "hello" })
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("throws 403 when attempt limit exceeded", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 2, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockCount.mockResolvedValue(2);

    await expect(
      submitAssignment({ assignmentId: "a1", userId: "u1", answerText: "hello" })
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("allows first attempt when maxAttempts is 1", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 1, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "u1",
      answerText: "hello",
      attemptNumber: 1,
      status: "SUBMITTED",
    });

    const result = await submitAssignment({ assignmentId: "a1", userId: "u1", answerText: "hello" });
    expect(result.attemptNumber).toBe(1);
    expect(result.status).toBe("SUBMITTED");
  });

  it("creates submission with fileUrl", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 3, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue({
      id: "sub2",
      assignmentId: "a1",
      userId: "u1",
      fileUrl: "/uploads/doc.pdf",
      attemptNumber: 1,
      status: "SUBMITTED",
    });

    const result = await submitAssignment({ assignmentId: "a1", userId: "u1", fileUrl: "/uploads/doc.pdf" });
    expect(result.fileUrl).toBe("/uploads/doc.pdf");
    expect(result.status).toBe("SUBMITTED");
  });
});

describe("reviewSubmission", () => {
  it("sets ACCEPTED status when accepted is true", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      status: "ACCEPTED",
      score: 85,
      feedback: "Good job",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: true, score: 85, feedback: "Good job" });
    expect(result.status).toBe("ACCEPTED");
    expect(result.score).toBe(85);
    expect(result.feedback).toBe("Good job");
  });

  it("sets NEEDS_REVISION status when accepted is false", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      status: "NEEDS_REVISION",
      score: 40,
      feedback: "Please revise",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: false, score: 40, feedback: "Please revise" });
    expect(result.status).toBe("NEEDS_REVISION");
  });

  it("allows review without score or feedback", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      status: "ACCEPTED",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: true });
    expect(result.status).toBe("ACCEPTED");
  });
});
