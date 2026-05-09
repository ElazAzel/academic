import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/courses/route";
import * as session from "@/lib/auth/session";
import { ApiError } from "@/lib/http";

describe("courses endpoints", () => {
  describe("GET /api/v1/courses", () => {
    it("returns error response on failure", async () => {
      vi.spyOn(session, "requireUser").mockRejectedValueOnce(
        new ApiError("unauthorized", "Unauthorized", 401)
      );

      const request = new Request("http://localhost/api/v1/courses");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error.code).toBe("unauthorized");
    });
  });
});
