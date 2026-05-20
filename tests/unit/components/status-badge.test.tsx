// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { getBadgeVariant, StatusBadge } from "@/components/lms/status-badge";

describe("StatusBadge", () => {
  it("maps risk and queue statuses to explicit operational tones", () => {
    render(
      <div>
        <StatusBadge status="critical" />
        <StatusBadge status="IN_REVIEW" />
        <StatusBadge status="ACTIVE" label="Активный поток" />
      </div>,
    );

    expect(screen.getByText("Критический").className).toContain("text-m3-error");
    expect(screen.getByText("На проверке").className).toContain("text-m3-secondary");
    expect(screen.getByText("Активный поток").className).toContain("bg-m3-primary-fixed");
  });

  it("exposes the same variant map for non-rendering callers", () => {
    expect(getBadgeVariant("COMPLETED")).toBe("success");
    expect(getBadgeVariant("overdue")).toBe("danger");
    expect(getBadgeVariant("forwarded")).toBe("warning");
  });
});
