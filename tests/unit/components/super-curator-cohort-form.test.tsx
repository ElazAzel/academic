// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockCreateCohortAction = vi.hoisted(() => vi.fn());
const mockUpdateCohortAction = vi.hoisted(() => vi.fn());
const mockDeleteCohortAction = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/super-curator", () => ({
  createCohortAction: mockCreateCohortAction,
  updateCohortAction: mockUpdateCohortAction,
  deleteCohortAction: mockDeleteCohortAction,
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

const { EditCohortForm } = await import("@/app/super-curator/cohorts/cohort-form");

function renderEditDialog() {
  render(
    <EditCohortForm
      cohort={{ id: "cohort-1", name: "Поток", startsAt: null, endsAt: null, status: "active" }}
      trigger={<button type="button">Открыть</button>}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Открыть/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateCohortAction.mockResolvedValue({ success: true });
  mockUpdateCohortAction.mockResolvedValue({ success: true });
  mockDeleteCohortAction.mockResolvedValue({ success: true });
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("super-curator cohort form", () => {
  it("shows controlled archive failure-result errors", async () => {
    mockDeleteCohortAction.mockResolvedValue({ success: false, error: "ID потока обязателен" });

    renderEditDialog();

    fireEvent.click(screen.getByRole("button", { name: /Архивировать/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("ID потока обязателен");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("does not expose raw archive action exceptions in toast copy", async () => {
    mockDeleteCohortAction.mockRejectedValue(new Error("postgres://secret-super-cohort-archive"));

    renderEditDialog();

    fireEvent.click(screen.getByRole("button", { name: /Архивировать/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось архивировать поток");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-super-cohort-archive"));
  });
});
