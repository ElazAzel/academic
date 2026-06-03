// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockAddStudentToCohortAction = vi.hoisted(() => vi.fn());
const mockAddCuratorAction = vi.hoisted(() => vi.fn());
const mockAssignCuratorFromSupervisorAction = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/super-curator", () => ({
  addStudentToCohortAction: mockAddStudentToCohortAction,
  addCuratorAction: mockAddCuratorAction,
}));

vi.mock("@/server/actions/admin", () => ({
  assignCuratorFromSupervisorAction: mockAssignCuratorFromSupervisorAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { AddStudentForm } = await import("@/app/super-curator/cohorts/[id]/add-student-form");
const { AddCuratorDialog } = await import("@/app/super-curator/curators/add-curator-form");
const { AssignCuratorForm } = await import("@/app/super-curator/distribution/assign-curator-form");

beforeEach(() => {
  vi.clearAllMocks();
  mockAddStudentToCohortAction.mockResolvedValue({ success: true });
  mockAddCuratorAction.mockResolvedValue({ success: true });
  mockAssignCuratorFromSupervisorAction.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("super-curator assignment forms", () => {
  it("does not expose raw add-student action exceptions in toast copy", async () => {
    mockAddStudentToCohortAction.mockRejectedValue(new Error("postgres://secret-add-student"));

    render(<AddStudentForm cohortId="cohort-1" courseTitle="Курс" courseId="course-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Добавить участника/i }));
    fireEvent.submit(screen.getByRole("button", { name: /^Добавить$/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось добавить участника в поток");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-add-student"));
  });

  it("shows controlled add-curator failure-result errors", async () => {
    mockAddCuratorAction.mockResolvedValue({ success: false, error: "Email обязателен" });

    render(<AddCuratorDialog />);

    fireEvent.click(screen.getByRole("button", { name: /Добавить куратора/i }));
    fireEvent.submit(screen.getByRole("button", { name: /^Добавить$/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Email обязателен");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("does not expose raw assign-curator action exceptions in toast copy", async () => {
    mockAssignCuratorFromSupervisorAction.mockRejectedValue(new Error("postgres://secret-assign-curator"));

    render(
      <AssignCuratorForm
        studentId="student-1"
        cohortId="cohort-1"
        curators={[{ id: "curator-1", name: "Куратор", email: "curator@example.test" }]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Куратор"), { target: { value: "curator-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Назначить/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось назначить куратора");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-assign-curator"));
  });
});
