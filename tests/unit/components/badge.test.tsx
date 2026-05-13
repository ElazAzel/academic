// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Badge className="custom-class">Tag</Badge>);
    const badge = screen.getByText("Tag");
    expect(badge.className).toContain("custom-class");
  });
});
