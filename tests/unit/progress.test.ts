import { describe, expect, it } from "vitest";
import { clamp } from "@/lib/utils";

describe("progress edge cases", () => {
  it("clamps percent to valid range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp(-1, 0, 100)).toBe(0);
    expect(clamp(-100, 0, 100)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(clamp(101, 0, 100)).toBe(100);
    expect(clamp(999, 0, 100)).toBe(100);
  });

  it("handles NaN gracefully", () => {
    expect(clamp(Number.NaN, 0, 100)).toBe(0);
    expect(clamp(Number.POSITIVE_INFINITY, 0, 100)).toBe(100);
    expect(clamp(Number.NEGATIVE_INFINITY, 0, 100)).toBe(0);
  });
});
