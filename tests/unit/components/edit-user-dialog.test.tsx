// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUpdateUserAction = vi.hoisted(() => vi.fn());
const mockDeleteUserAction = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/admin", () => ({
  updateUserAction: mockUpdateUserAction,
  deleteUserAction: mockDeleteUserAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { DeleteUserButton, EditUserDialog } = await import("@/components/admin/edit-user-dialog");

const user = {
  id: "user-1",
  name: "Слушатель",
  email: "student@example.test",
  status: "ACTIVE",
  realName: "Иван Петров",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateUserAction.mockResolvedValue({ success: true });
  mockDeleteUserAction.mockResolvedValue({ success: true });
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EditUserDialog", () => {
  it("shows controlled update failure-result errors", async () => {
    mockUpdateUserAction.mockResolvedValue({ success: false, error: "ID пользователя обязателен" });

    render(<EditUserDialog user={user} />);

    fireEvent.click(screen.getByRole("button", { name: /Редактировать пользователя/i }));
    fireEvent.submit(screen.getByRole("button", { name: /Сохранить/i }).closest("form")!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("ID пользователя обязателен");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("does not expose raw delete action exceptions in toast copy", async () => {
    mockDeleteUserAction.mockRejectedValue(new Error("postgres://secret-user-delete"));

    render(<DeleteUserButton userId="user-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Деактивировать пользователя/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось деактивировать пользователя");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-user-delete"));
  });
});
