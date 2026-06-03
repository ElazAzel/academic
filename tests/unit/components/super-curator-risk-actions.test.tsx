// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockCreateRiskAction = vi.hoisted(() => vi.fn());
const mockResolveRiskAction = vi.hoisted(() => vi.fn());
const mockGetStudentsForRisk = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/risk-management", () => ({
  createRiskAction: mockCreateRiskAction,
  resolveRiskAction: mockResolveRiskAction,
  getStudentsForRisk: mockGetStudentsForRisk,
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

const { ResolveRiskButton, RiskActions } = await import("@/app/super-curator/risks/risk-actions");

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateRiskAction.mockResolvedValue({ success: true });
  mockResolveRiskAction.mockResolvedValue({ success: true });
  mockGetStudentsForRisk.mockResolvedValue([{ id: "student-1", name: "Слушатель", email: "student@example.test" }]);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("super-curator risk actions", () => {
  it("does not expose raw student-list load exceptions in toast copy", async () => {
    mockGetStudentsForRisk.mockRejectedValue(new Error("postgres://secret-risk-students"));

    render(<RiskActions />);

    fireEvent.click(screen.getByRole("button", { name: /Создать риск/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось загрузить список слушателей");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-risk-students"));
  });

  it("shows controlled create-risk failure-result errors", async () => {
    mockCreateRiskAction.mockResolvedValue({ success: false, error: "Слушатель и тип риска обязательны" });

    render(<RiskActions />);

    fireEvent.click(screen.getByRole("button", { name: /Создать риск/i }));
    fireEvent.submit(screen.getByRole("button", { name: /^Создать$/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Слушатель и тип риска обязательны");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("does not expose raw resolve-risk action exceptions in toast copy", async () => {
    mockResolveRiskAction.mockRejectedValue(new Error("postgres://secret-risk-resolve"));

    render(<ResolveRiskButton riskId="risk-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Закрыть риск/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось закрыть риск");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-risk-resolve"));
  });
});
