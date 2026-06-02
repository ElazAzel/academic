import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockGetToken = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mockUserFindUnique },
  }),
}));

import { GET } from "@/app/api/v1/auth/redirect-target/route";

function request() {
  return new Request("http://localhost/api/v1/auth/redirect-target") as NextRequest;
}

describe("auth redirect target", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses roles from the JWT token when present", async () => {
    mockGetToken.mockResolvedValue({ roles: ["admin"], email: "admin@academy.local" });

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/admin");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("uses product role priority when JWT has several roles", async () => {
    mockGetToken.mockResolvedValue({
      roles: ["student", "customer_observer", "instructor"],
      email: "multi@academy.local",
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/instructor");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("falls back to database roles when token roles are not propagated yet", async () => {
    mockGetToken.mockResolvedValue({ email: "supercurator@academy.local" });
    mockUserFindUnique.mockResolvedValue({
      status: "ACTIVE",
      roles: [{ role: { key: "super_curator" } }],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/super-curator");
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: "supercurator@academy.local" },
      select: {
        status: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });
  });

  it("applies product role priority to database fallback roles", async () => {
    mockGetToken.mockResolvedValue({ email: "fallback@academy.local" });
    mockUserFindUnique.mockResolvedValue({
      status: "ACTIVE",
      roles: [{ role: { key: "student" } }, { role: { key: "curator" } }],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/curator");
  });

  it("does not use database roles for inactive users", async () => {
    mockGetToken.mockResolvedValue({ email: "blocked@academy.local" });
    mockUserFindUnique.mockResolvedValue({
      status: "blocked",
      roles: [{ role: { key: "admin" } }],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/403");
  });

  it("returns forbidden when neither token nor database roles are available", async () => {
    mockGetToken.mockResolvedValue({});

    const response = await GET(request());
    const body = await response.json();

    expect(body.data.path).toBe("/403");
  });
});
