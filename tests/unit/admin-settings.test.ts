import { describe, expect, it, vi } from "vitest";

const mockAppSettingFindUnique = vi.hoisted(() => vi.fn());
const mockAppSettingFindMany = vi.hoisted(() => vi.fn());
const mockAppSettingUpsert = vi.hoisted(() => vi.fn());
const mock$transaction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    appSetting: {
      findUnique: mockAppSettingFindUnique,
      findMany: mockAppSettingFindMany,
      upsert: mockAppSettingUpsert,
    },
    $transaction: mock$transaction,
  }),
}));

const { getAppSetting, getAllAppSettings, setAppSetting, setAppSettings } = await import("@/server/modules/admin/settings");

describe("getAppSetting", () => {
  it("returns value for existing key", async () => {
    mockAppSettingFindUnique.mockResolvedValue({ key: "SMTP_HOST", value: "smtp.example.com" });

    const result = await getAppSetting("SMTP_HOST", "default");
    expect(result).toBe("smtp.example.com");
  });

  it("returns default for non-existing key", async () => {
    mockAppSettingFindUnique.mockResolvedValue(null);

    const result = await getAppSetting("NON_EXISTENT", 42);
    expect(result).toBe(42);
  });
});

describe("getAllAppSettings", () => {
  it("returns all settings merged with defaults", async () => {
    mockAppSettingFindMany.mockResolvedValue([
      { key: "SMTP_HOST", value: "smtp.custom.com" },
      { key: "FEATURE_PUSH_NOTIFICATIONS", value: true },
    ]);

    const result = await getAllAppSettings();
    expect(result.SMTP_HOST).toBe("smtp.custom.com");
    expect(result.FEATURE_PUSH_NOTIFICATIONS).toBe(true);
    expect(result.SMTP_PORT).toBe("1025");
    expect(result.CERTIFICATE_COMPLETION_THRESHOLD).toBe(85);
  });

  it("returns defaults when table is empty", async () => {
    mockAppSettingFindMany.mockResolvedValue([]);

    const result = await getAllAppSettings();
    expect(result.SMTP_HOST).toBe("localhost");
    expect(result.SMTP_PORT).toBe("1025");
    expect(result.FEATURE_PUSH_NOTIFICATIONS).toBe(false);
  });
});

describe("setAppSetting", () => {
  it("creates or updates a setting via upsert", async () => {
    mockAppSettingUpsert.mockResolvedValue({ key: "FEATURE_GRAPHQL", value: true });

    await setAppSetting("FEATURE_GRAPHQL", true);
    expect(mockAppSettingUpsert).toHaveBeenCalledWith({
      where: { key: "FEATURE_GRAPHQL" },
      update: { value: true },
      create: { key: "FEATURE_GRAPHQL", value: true },
    });
  });
});

describe("setAppSettings", () => {
  it("calls $transaction with upserts for each entry", async () => {
    mock$transaction.mockResolvedValue([]);

    await setAppSettings({ SMTP_HOST: "smtp.test.com", FEATURE_PUSH_NOTIFICATIONS: true });
    expect(mock$transaction).toHaveBeenCalled();
    const calls = mock$transaction.mock.calls[0][0] as unknown[];
    expect(calls).toHaveLength(2);
  });
});
