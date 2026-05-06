import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("seed data contract", () => {
  it("contains required demo courses and academy roles", () => {
    const seed = readFileSync("prisma/seed.ts", "utf8");
    expect(seed).toContain("AI Strategy Fundamentals");
    expect(seed).toContain("Prompt Engineering for Leaders");
    expect(seed).toContain("AI Governance and Risk");
    expect(seed).toContain("super_curator");
    expect(seed).toContain("customer_observer");
  });
});

