// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUpdateProfileSettingsAction = vi.hoisted(() => vi.fn());
const mockUpdatePasswordAction = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/settings", () => ({
  updateProfileSettingsAction: mockUpdateProfileSettingsAction,
  updatePasswordAction: mockUpdatePasswordAction,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { ProfileSettingsForm, SecuritySettingsForm } = await import("@/components/lms/settings-forms");

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateProfileSettingsAction.mockResolvedValue(undefined);
  mockUpdatePasswordAction.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("settings forms", () => {
  it("does not expose raw profile action errors in toast copy", async () => {
    mockUpdateProfileSettingsAction.mockRejectedValue(new Error("postgres://secret-profile-settings"));

    render(<ProfileSettingsForm user={{ name: "Иван", email: "ivan@example.test" }} />);

    fireEvent.submit(screen.getByRole("button", { name: /Сохранить/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось обновить профиль");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-profile-settings"));
  });

  it("keeps known password validation errors visible", async () => {
    mockUpdatePasswordAction.mockRejectedValue(new Error("Неверный текущий пароль"));

    render(<SecuritySettingsForm />);

    fireEvent.submit(screen.getByRole("button", { name: /Изменить пароль/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Неверный текущий пароль");
    });
  });

  it("does not expose raw password action errors in toast copy", async () => {
    mockUpdatePasswordAction.mockRejectedValue(new Error("postgres://secret-password-settings"));

    render(<SecuritySettingsForm />);

    fireEvent.submit(screen.getByRole("button", { name: /Изменить пароль/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось обновить пароль");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-password-settings"));
  });
});
