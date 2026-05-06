import { describe, expect, it } from "vitest";
import { GET as healthz } from "@/app/api/v1/healthz/route";

describe("health endpoints", () => {
  it("returns liveness payload", async () => {
    const response = healthz();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("ok");
  });
});

