import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockValidateXapiKey = vi.hoisted(() => vi.fn());
const mockStoreStatements = vi.hoisted(() => vi.fn());
const mockGetStatement = vi.hoisted(() => vi.fn());
const mockSearchStatements = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/xapi/auth", () => ({ validateXapiKey: mockValidateXapiKey }));
vi.mock("@/server/modules/xapi/lrs", () => ({
  storeStatements: mockStoreStatements,
  getStatement: mockGetStatement,
  searchStatements: mockSearchStatements,
}));

const xapiRoute = await import("@/app/api/v1/xapi/statements/route");

const validStatement = {
  id: "statement-1",
  actor: { objectType: "Agent", account: { name: "student-1" } },
  verb: { id: "http://adlnet.gov/expapi/verbs/completed" },
  object: { id: "lesson-1" },
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/xapi/statements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidateXapiKey.mockReturnValue(false);
  mockRequireUser.mockResolvedValue({ id: "user-1", roles: ["student"] });
  mockStoreStatements.mockResolvedValue(undefined);
  mockGetStatement.mockResolvedValue(null);
  mockSearchStatements.mockResolvedValue([]);
});

describe("xAPI statements API", () => {
  it("requires either a valid xAPI key or an authenticated user before parsing statements", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("unauthorized", "Требуется вход", 401));

    const response = await xapiRoute.POST(jsonRequest(validStatement));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockStoreStatements).not.toHaveBeenCalled();
  });

  it("rejects invalid xAPI statement payloads before storage", async () => {
    const response = await xapiRoute.POST(jsonRequest({ id: "statement-1" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockStoreStatements).not.toHaveBeenCalled();
  });

  it("stores a single valid statement for an authenticated user", async () => {
    const response = await xapiRoute.POST(jsonRequest(validStatement));

    expect(response.status).toBe(204);
    expect(mockStoreStatements).toHaveBeenCalledWith([validStatement]);
  });

  it("stores a batch when the xAPI key is valid without requiring a user session", async () => {
    mockValidateXapiKey.mockReturnValue(true);
    const secondStatement = { ...validStatement, id: "statement-2" };

    const response = await xapiRoute.POST(jsonRequest([validStatement, secondStatement]));

    expect(response.status).toBe(204);
    expect(mockRequireUser).not.toHaveBeenCalled();
    expect(mockStoreStatements).toHaveBeenCalledWith([validStatement, secondStatement]);
  });
});
