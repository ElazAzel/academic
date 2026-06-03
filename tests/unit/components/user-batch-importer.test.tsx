// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RoleKey } from "@prisma/client";

const mockImportUsersAction = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/admin", () => ({
  importUsersAction: mockImportUsersAction,
}));

const { UserBatchImporter } = await import("@/components/admin/user-batch-importer");

beforeEach(() => {
  vi.clearAllMocks();
  mockImportUsersAction.mockResolvedValue({ success: true, results: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UserBatchImporter", () => {
  it("shows a controlled import error without logging raw action details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockImportUsersAction.mockRejectedValue(new Error("postgres://secret-batch-import"));

    render(<UserBatchImporter assignableRoles={[RoleKey.student]} cohorts={[]} />);

    fireEvent.change(screen.getByLabelText(/Или вставьте текст вручную/i), {
      target: { value: "student@example.test, Иван Иванов" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Анализировать данные/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Запустить импорт \(1\)/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось импортировать пользователей");
    expect(screen.queryByText(/secret-batch-import/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "[UserBatchImporter] Failed to import users",
        expect.objectContaining({ errorType: "Error" }),
      );
    });
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-batch-import");
  });
});
