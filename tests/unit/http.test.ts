import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { parseJson, ApiError, errorResponse } from "@/lib/http";

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

  describe("errorResponse", () => {
    it("preserves controlled ApiError messages", async () => {
      const response = errorResponse(new ApiError("forbidden", "Нет доступа", 403));
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toMatchObject({
        code: "forbidden",
        message: "Нет доступа",
      });
    });

    it("does not leak raw generic internal error messages", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const response = errorResponse(new Error("postgres://secret-http-error"));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toMatchObject({
        code: "internal_error",
        message: "Внутренняя ошибка сервера",
      });
      expect(JSON.stringify(body)).not.toContain("secret-http-error");
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-http-error");
      expect(consoleSpy).toHaveBeenCalledWith("[API Error]", expect.objectContaining({ errorType: "Error" }));
      consoleSpy.mockRestore();
    });
  });
});
