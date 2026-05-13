import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockVerifyPassword = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockGetUserNotificationPreferences = vi.hoisted(() => vi.fn());
const mockSetNotificationPreferences = vi.hoisted(() => vi.fn());
const mockGetAllAppSettings = vi.hoisted(() => vi.fn());
const mockSetAppSettings = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: mockHashPassword, verifyPassword: mockVerifyPassword }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/server/modules/notifications/service", () => ({ createNotification: mockCreateNotification }));
vi.mock("@/server/modules/notifications/preferences", () => ({
  getUserNotificationPreferences: mockGetUserNotificationPreferences,
  setNotificationPreferences: mockSetNotificationPreferences,
}));
vi.mock("@/server/modules/admin/settings", () => ({
  getAllAppSettings: mockGetAllAppSettings,
  setAppSettings: mockSetAppSettings,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { update: mockUserUpdate, findUnique: mockUserFindUnique },
  }),
}));

const {
  updateProfileSettingsAction, updatePasswordAction,
  getNotificationPreferencesAction, updateNotificationPreferencesAction,
  getAppSettingsAction, updateAppSettingsAction,
} = await import("@/server/actions/settings");

const testUser = { id: "u1", email: "user@test.com", name: "User", roles: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue(testUser);
  mockHashPassword.mockResolvedValue("hashed-new-pass");
  mockVerifyPassword.mockResolvedValue(true);
});

describe("updateProfileSettingsAction", () => {
  it("updates profile and sends notification", async () => {
    const fd = new FormData();
    fd.set("name", "New Name");
    fd.set("phone", "+7-999-123-45-67");
    fd.set("organization", "Acme");

    await updateProfileSettingsAction(fd);
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "u1" },
      data: expect.objectContaining({ name: "New Name", phone: "+7-999-123-45-67", organization: "Acme" }),
    }));
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({ event: "profile_updated" }));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("accepts empty form (all optional fields)", async () => {
    const fd = new FormData();
    await updateProfileSettingsAction(fd);
    expect(mockUserUpdate).toHaveBeenCalled();
  });
});

describe("updatePasswordAction", () => {
  beforeEach(() => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: "old-hash" });
  });

  it("updates password successfully", async () => {
    const fd = new FormData();
    fd.set("currentPassword", "old-pass");
    fd.set("newPassword", "new-long-password-here");
    fd.set("confirmPassword", "new-long-password-here");

    await updatePasswordAction(fd);
    expect(mockVerifyPassword).toHaveBeenCalledWith("old-hash", "old-pass");
    expect(mockHashPassword).toHaveBeenCalledWith("new-long-password-here");
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "u1" },
      data: { passwordHash: "hashed-new-pass" },
    }));
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({ event: "password_changed" }));
  });

  it("throws if passwords do not match", async () => {
    const fd = new FormData();
    fd.set("currentPassword", "old-pass");
    fd.set("newPassword", "new-pass-1234567");
    fd.set("confirmPassword", "different-pass");

    await expect(updatePasswordAction(fd)).rejects.toThrow("Новые пароли не совпадают");
  });

  it("throws if new password too short", async () => {
    const fd = new FormData();
    fd.set("currentPassword", "old-pass");
    fd.set("newPassword", "short");
    fd.set("confirmPassword", "short");

    await expect(updatePasswordAction(fd)).rejects.toThrow("Пароль должен быть минимум 10 символов");
  });

  it("throws if user has no password hash", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", passwordHash: null });

    const fd = new FormData();
    fd.set("currentPassword", "old-pass");
    fd.set("newPassword", "new-long-password-here");
    fd.set("confirmPassword", "new-long-password-here");

    await expect(updatePasswordAction(fd)).rejects.toThrow("Учетная запись не найдена");
  });

  it("throws if current password is wrong", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const fd = new FormData();
    fd.set("currentPassword", "wrong-pass");
    fd.set("newPassword", "new-long-password-here");
    fd.set("confirmPassword", "new-long-password-here");

    await expect(updatePasswordAction(fd)).rejects.toThrow("Неверный текущий пароль");
  });
});

describe("getNotificationPreferencesAction", () => {
  it("returns preferences for current user", async () => {
    mockGetUserNotificationPreferences.mockResolvedValue({ in_app: true, email: false });

    const result = await getNotificationPreferencesAction();
    expect(mockGetUserNotificationPreferences).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ in_app: true, email: false });
  });
});

describe("updateNotificationPreferencesAction", () => {
  it("updates preferences from form data", async () => {
    const fd = new FormData();
    fd.set("notification_in_app", "true");
    fd.set("notification_email", "false");

    await updateNotificationPreferencesAction(fd);
    expect(mockSetNotificationPreferences).toHaveBeenCalledWith("u1", [
      { channel: "in_app", enabled: true },
      { channel: "email", enabled: false },
    ]);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });
});

describe("getAppSettingsAction", () => {
  it("returns app settings", async () => {
    mockGetAllAppSettings.mockResolvedValue({ SMTP_HOST: "smtp.test.com", FEATURE_PUSH_NOTIFICATIONS: true });

    const result = await getAppSettingsAction();
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(result.SMTP_HOST).toBe("smtp.test.com");
  });
});

describe("updateAppSettingsAction", () => {
  it("updates settings from form data", async () => {
    const fd = new FormData();
    fd.set("setting_SMTP_HOST", "smtp.new.com");
    fd.set("setting_FEATURE_PUSH_NOTIFICATIONS", "true");
    fd.set("setting_SMTP_PORT", "587");

    await updateAppSettingsAction(fd);
    expect(mockSetAppSettings).toHaveBeenCalledWith({
      SMTP_HOST: "smtp.new.com",
      FEATURE_PUSH_NOTIFICATIONS: true,
      SMTP_PORT: 587,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/settings", "layout");
  });
});
