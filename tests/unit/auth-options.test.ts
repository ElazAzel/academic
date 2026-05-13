import type { RoleKey } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  }),
}));

vi.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(async () => true),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 119,
    resetAt: Date.now() + 60_000,
  })),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_SECRET: "test-secret-test-secret",
    GOOGLE_CLIENT_ID: undefined,
    GOOGLE_CLIENT_SECRET: undefined,
    GITHUB_CLIENT_ID: undefined,
    GITHUB_CLIENT_SECRET: undefined,
  },
}));

vi.mock("@/server/auth/provider-flags", () => ({
  getEnabledOAuthProviders: () => ({ google: false, github: false }),
}));

type CredentialsAuthorize = (
  credentials: Record<"email" | "password", string> | undefined,
) => Promise<unknown>;

async function getCredentialsAuthorize() {
  const { authOptions } = await import("@/server/auth/options");
  const provider = authOptions.providers.find((item) => item.id === "credentials") as
    | { options?: { authorize?: CredentialsAuthorize } }
    | undefined;

  if (!provider?.options?.authorize) {
    throw new Error("Credentials provider authorize callback was not found");
  }

  return provider.options.authorize;
}

describe("credentials provider authorization", () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockUserUpdate.mockReset();
  });

  it("accepts users with lowercase active status from Prisma defaults", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user_1",
      email: "admin@academy.local",
      name: "Admin",
      image: null,
      passwordHash: "hashed-password",
      status: "active",
      roles: [{ role: { key: "admin" satisfies RoleKey } }],
    });
    mockUserUpdate.mockResolvedValue({});

    const authorize = await getCredentialsAuthorize();
    const result = await authorize({
      email: "ADMIN@ACADEMY.LOCAL ",
      password: "Password123!",
    });

    expect(result).toEqual({
      id: "user_1",
      email: "admin@academy.local",
      name: "Admin",
      image: null,
      roles: ["admin"],
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "admin@academy.local" },
      }),
    );
  });
});
