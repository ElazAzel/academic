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

    // Clickable card links to risks page
    const link = criticalValue.closest("a");
    expect(link).toHaveAttribute("href", "/super-curator/risks");
    // Critical priority adds a visual ring
    const card = link?.querySelector(".rounded-xl");
    expect(card?.className).toBeDefined();
    expect(card?.className).toContain("ring-m3-error");

    // Success metric uses tertiary color
    expect(screen.getByText("92%").className).toContain("text-m3-tertiary");
  });
});
