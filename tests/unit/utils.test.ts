import { describe, expect, it } from "vitest";
import { clamp } from "@/lib/utils";

describe("clamp", () => {
  it("should return the value if it is within the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("should return the minimum value if the input is below the range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(0, 5, 10)).toBe(5);
  });

  it("should return the maximum value if the input is above the range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(10, 0, 5)).toBe(5);
  });

  it("should return the value if it is equal to the minimum", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it("should return the value if it is equal to the maximum", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("should handle negative ranges", () => {
    expect(clamp(-5, -10, -2)).toBe(-5);
    expect(clamp(-15, -10, -2)).toBe(-10);
    expect(clamp(0, -10, -2)).toBe(-2);
  });

  it("should handle floating point numbers", () => {
    expect(clamp(0.1 + 0.2, 0, 1)).toBeCloseTo(0.3);
    expect(clamp(1.5, 1.1, 1.4)).toBe(1.4);
  });

  it("should work when min and max are the same", () => {
    expect(clamp(5, 10, 10)).toBe(10);
    expect(clamp(15, 10, 10)).toBe(10);
    expect(clamp(10, 10, 10)).toBe(10);
  });
});
