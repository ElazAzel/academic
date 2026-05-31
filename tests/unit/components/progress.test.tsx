// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("renders with value", () => {
    render(<Progress value={60} />);
    const bar = screen.getByLabelText("Прогресс 60%");
    expect(bar).toBeInTheDocument();
  });

  it("clamps value to 0-100 range", () => {
    const { rerender } = render(<Progress value={150} />);
    expect(screen.getByLabelText("Прогресс 100%")).toHaveAttribute("aria-valuenow", "100");

    rerender(<Progress value={-10} />);
    expect(screen.getByLabelText("Прогресс 0%")).toHaveAttribute("aria-valuenow", "0");
  });
});
