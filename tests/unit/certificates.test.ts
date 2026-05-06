import { describe, expect, it } from "vitest";
import { generateCertificateNumber } from "@/server/modules/certificates/service";

describe("certificates", () => {
  it("generates academy certificate numbers", () => {
    expect(generateCertificateNumber()).toMatch(/^ASA-\d{4}-[A-Z0-9]{8}$/);
  });
});

