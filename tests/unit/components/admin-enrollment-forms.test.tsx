// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockEnrollStudentAction = vi.hoisted(() => vi.fn());
const mockDeleteEnrollmentAction = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockOnSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/admin", () => ({
  enrollStudentAction: mockEnrollStudentAction,
  deleteEnrollmentAction: mockDeleteEnrollmentAction,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

const { DeleteEnrollmentButton } = await import("@/components/admin/delete-enrollment-button");
const { EnrollStudentForm } = await import("@/components/admin/enroll-student-form");

const enrollmentFormData = {
  students: [{ id: "student-1", name: "Слушатель", email: "student@example.test" }],
  courses: [{ id: "course-1", title: "Курс" }],
  cohorts: [{ id: "cohort-1", name: "Поток", courseId: "course-1" }],
  curators: [{ id: "curator-1", name: "Куратор", email: "curator@example.test" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEnrollStudentAction.mockResolvedValue({ success: true });
  mockDeleteEnrollmentAction.mockResolvedValue({ success: true });
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("admin enrollment forms", () => {
  it("shows controlled enroll failure-result errors", async () => {
    mockEnrollStudentAction.mockResolvedValue({ success: false, error: "ID студента обязателен" });

    render(<EnrollStudentForm data={enrollmentFormData} onSuccess={mockOnSuccess} />);

    fireEvent.submit(screen.getByRole("button", { name: /Зачислить/i }).closest("form")!);

    expect(await screen.findByText("ID студента обязателен")).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("does not expose raw enroll action exceptions in inline error copy", async () => {
    mockEnrollStudentAction.mockRejectedValue(new Error("postgres://secret-enroll"));

    render(<EnrollStudentForm data={enrollmentFormData} />);

    fireEvent.submit(screen.getByRole("button", { name: /Зачислить/i }).closest("form")!);

    expect(await screen.findByText("Не удалось зачислить слушателя")).toBeInTheDocument();
    expect(screen.queryByText(/secret-enroll/i)).not.toBeInTheDocument();
  });

  it("does not expose raw delete action exceptions in toast copy", async () => {
    mockDeleteEnrollmentAction.mockRejectedValue(new Error("postgres://secret-enrollment-delete"));

    render(<DeleteEnrollmentButton enrollmentId="enrollment-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Удалить зачисление/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось удалить зачисление");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-enrollment-delete"));
  });
});
