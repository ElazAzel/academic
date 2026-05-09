import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJson, ApiError } from "@/lib/http";

describe("http utils", () => {
  describe("parseJson", () => {
    it("should throw bad_request ApiError when request.json() throws", async () => {
      // Mock request that throws when parsing json
      const mockRequest = {
        json: async () => {
          throw new Error("Invalid JSON");
        }
      } as unknown as Request;

      const schema = z.object({ name: z.string() });

      try {
        await parseJson(mockRequest, schema);
        expect.fail("Expected parseJson to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.code).toBe("bad_request");
        expect(apiError.message).toBe("Тело запроса должно быть JSON");
        expect(apiError.status).toBe(400);
      }
    });

    it("should parse valid JSON successfully", async () => {
      const payload = { name: "Test User" };
      const mockRequest = {
        json: async () => payload
      } as unknown as Request;

      const schema = z.object({ name: z.string() });

      const result = await parseJson(mockRequest, schema);
      expect(result).toEqual(payload);
    });

    it("should throw validation error when payload does not match schema", async () => {
      const payload = { age: 30 };
      const mockRequest = {
        json: async () => payload
      } as unknown as Request;

      const schema = z.object({ name: z.string() });

      try {
        await parseJson(mockRequest, schema);
        expect.fail("Expected parseJson to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });
});
