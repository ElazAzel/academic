// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import type { DashboardMetric } from "@/types/domain";

describe("MetricGrid", () => {
  it("renders large operational KPI values with details and tone classes", () => {
    const metrics: DashboardMetric[] = [
      {
        label: "Критичные",
        value: 12,
        tone: "danger",
        detail: "3 старше 24 часов",
        priority: "critical",
        href: "/super-curator/risks",
      },
      {
        label: "Норма",
        value: "92%",
        tone: "success",
        detail: "Средний прогресс",
      },
    ];

    render(<MetricGrid metrics={metrics} />);

    expect(screen.getByText("Критичные")).toBeInTheDocument();
    expect(screen.getByText("3 старше 24 часов")).toBeInTheDocument();

    const criticalValue = screen.getByText("12");
    expect(criticalValue.className).toContain("text-display-lg");
    expect(criticalValue.className).toContain("tabular-nums");

    const criticalCard = criticalValue.closest(".border-l-m3-error");
    expect(criticalCard?.className).toContain("ring-m3-error");
    expect(criticalValue.closest("a")).toHaveAttribute("href", "/super-curator/risks");

    expect(screen.getByText("92%").className).toContain("text-m3-tertiary");
  });
});
