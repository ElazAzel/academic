import { describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAssertGraphqlEnabled = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/graphql/resolvers", () => ({
  assertGraphqlEnabled: mockAssertGraphqlEnabled,
}));

const { POST } = await import("@/app/api/v1/graphql/route");

describe("GraphQL scaffold route", () => {
  it("returns Russian not-implemented copy when the scaffold route is reached", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mockAssertGraphqlEnabled.mockReturnValue(undefined);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error).toEqual({
      code: "not_implemented",
      message: "Серверная часть GraphQL пока не реализована. Используйте REST-эндпоинты текущей версии.",
    });
  });
});
