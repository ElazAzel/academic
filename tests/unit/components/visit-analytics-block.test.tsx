// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockGetVisitAnalytics = vi.hoisted(() => vi.fn());
const mockGetTimingAnalytics = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/visit-analytics", () => ({
  getVisitAnalytics: mockGetVisitAnalytics,
  getTimingAnalytics: mockGetTimingAnalytics,
}));

vi.mock("@/components/charts/visit-bar-chart", () => ({
  VisitBarChart: () => <div data-testid="visit-chart" />,
}));

vi.mock("@/components/admin/per-user-visit-table", () => ({
  PerUserVisitTable: () => <div data-testid="per-user-visit-table" />,
}));

const { VisitAnalyticsBlock } = await import("@/components/admin/visit-analytics-block");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockGetVisitAnalytics.mockReset();
  mockGetTimingAnalytics.mockReset();
});

describe("VisitAnalyticsBlock", () => {
  it("does not expose technical action errors in the visible analytics error state", async () => {
    mockGetVisitAnalytics.mockRejectedValue(new Error("database password leaked in stack"));
    mockGetTimingAnalytics.mockResolvedValue({
      messagesByHour: [],
      lessonsByHour: [],
      quizzesByHour: [],
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(await VisitAnalyticsBlock({ days: 30 }));

    expect(screen.getByText("Не удалось загрузить данные посещаемости")).toBeInTheDocument();
    expect(screen.getByText("Попробуйте обновить страницу или открыть раздел позже.")).toBeInTheDocument();
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument();
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("database password leaked");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[VisitAnalyticsBlock] Failed to load analytics",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
