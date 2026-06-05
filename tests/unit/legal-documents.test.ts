import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreateMany = vi.hoisted(() => vi.fn());
const mockGetAllAppSettings = vi.hoisted(() => vi.fn());
const mockSetAppSettings = vi.hoisted(() => vi.fn());
const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    consentLog: {
      findMany: mockFindMany,
      createMany: mockCreateMany,
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/modules/admin/settings", () => ({
  getAllAppSettings: mockGetAllAppSettings,
  setAppSettings: mockSetAppSettings,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

// Load modules after mocks
const { getConsentVersions, hasUserConsented, acceptConsent } = await import("@/server/modules/consent/service");
const { updateLegalDocumentAction } = await import("@/server/actions/settings");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("legal documents consent", () => {
  it("resolves consent versions from app settings with default fallbacks", async () => {
    mockGetAllAppSettings.mockResolvedValue({
      LEGAL_VERSION_PRIVACY_POLICY: "2026-06-04-12345",
      // terms and cookie left undefined to check fallbacks
    });

    const versions = await getConsentVersions();
    expect(versions).toEqual({
      privacy_policy: "2026-06-04-12345",
      terms_of_use: "2026-05-01",
      cookie_notice: "2026-05-01",
    });
  });

  it("checks user consent against dynamic versions", async () => {
    // Setting versions: privacy has changed to v2, others on default
    mockGetAllAppSettings.mockResolvedValue({
      LEGAL_VERSION_PRIVACY_POLICY: "v2",
    });

    // Mock accepted logs for user: user accepted privacy-v1, terms-default, cookie-default
    mockFindMany.mockResolvedValue([
      { type: "privacy_policy", version: "v1" },
      { type: "terms_of_use", version: "2026-05-01" },
      { type: "cookie_notice", version: "2026-05-01" },
    ]);

    const consented = await hasUserConsented("user-1");
    // Should be false because privacy policy has changed to v2
    expect(consented).toBe(false);
  });

  it("returns true if user has accepted all current versions", async () => {
    mockGetAllAppSettings.mockResolvedValue({
      LEGAL_VERSION_PRIVACY_POLICY: "v2",
      LEGAL_VERSION_TERMS_OF_USE: "2026-05-01",
      LEGAL_VERSION_COOKIE_NOTICE: "2026-05-01",
    });

    mockFindMany.mockResolvedValue([
      { type: "privacy_policy", version: "v2" },
      { type: "terms_of_use", version: "2026-05-01" },
      { type: "cookie_notice", version: "2026-05-01" },
    ]);

    const consented = await hasUserConsented("user-1");
    expect(consented).toBe(true);
  });

  it("saves acceptConsent with the current dynamic versions", async () => {
    mockGetAllAppSettings.mockResolvedValue({
      LEGAL_VERSION_PRIVACY_POLICY: "v3-custom",
      LEGAL_VERSION_TERMS_OF_USE: "2026-05-01",
      LEGAL_VERSION_COOKIE_NOTICE: "2026-05-01",
    });

    await acceptConsent("user-1", "127.0.0.1", "Vitest Client");

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "user-1",
          type: "privacy_policy",
          version: "v3-custom",
          status: "ACCEPTED",
          ipAddress: "127.0.0.1",
          userAgent: "Vitest Client",
        }),
      ]),
    });
  });
});

describe("updateLegalDocumentAction server action", () => {
  it("saves content and optionally generates a new version string", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });

    const formData = new FormData();
    formData.append("slug", "privacy-policy");
    formData.append("content", "Новый текст политики безопасности");
    formData.append("incrementVersion", "true");

    await updateLegalDocumentAction(formData);

    expect(mockSetAppSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        LEGAL_CONTENT_PRIVACY_POLICY: "Новый текст политики безопасности",
        LEGAL_VERSION_PRIVACY_POLICY: expect.stringMatching(/^\d{4}-\d{2}-\d{2}-\d+$/),
      })
    );
  });
});
