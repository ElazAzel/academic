import { describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/v1/auth/register/route";

describe("disabled self-registration", () => {
  it("returns 410 because accounts are issued by the academy", async () => {
    const response = await register();
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload.error.code).toBe("gone");
  });
});
