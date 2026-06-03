// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockCreateCohortAction = vi.hoisted(() => vi.fn());
const mockUpdateCohortAction = vi.hoisted(() => vi.fn());
const mockRouterPush = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/admin", () => ({
  createCohortAction: mockCreateCohortAction,
  updateCohortAction: mockUpdateCohortAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { CreateCohortForm } = await import("@/app/admin/cohorts/new/create-cohort-form");
const { EditCohortForm } = await import("@/app/admin/cohorts/[cohortId]/edit-cohort-form");

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateCohortAction.mockResolvedValue({ success: true });
  mockUpdateCohortAction.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("admin cohort forms", () => {
  it("shows controlled create failure-result errors", async () => {
    mockCreateCohortAction.mockResolvedValue({ success: false, error: "Название и курс обязательны" });

    render(<CreateCohortForm courses={[{ id: "course-1", title: "Стратегия" }]} />);

    fireEvent.submit(screen.getByRole("button", { name: /Создать поток/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Название и курс обязательны");
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("does not expose raw update action exceptions in toast copy", async () => {
    mockUpdateCohortAction.mockRejectedValue(new Error("postgres://secret-cohort-update"));

    render(
      <EditCohortForm
        cohort={{ id: "cohort-1", name: "Поток", courseId: "course-1", startsAt: null, endsAt: null, status: "active" }}
        courses={[{ id: "course-1", title: "Стратегия" }]}
      />,
    );

    fireEvent.submit(screen.getByRole("button", { name: /Сохранить изменения/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось обновить поток");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-cohort-update"));
  });
});
