// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockCreateUserAction = vi.hoisted(() => vi.fn());
const mockOnClose = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/admin", () => ({
  createUserAction: mockCreateUserAction,
}));

const { CreateUserModal } = await import("@/components/admin/create-user-modal");

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateUserAction.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreateUserModal", () => {
  it("does not expose raw create action exceptions in inline error copy", async () => {
    mockCreateUserAction.mockRejectedValue(new Error("postgres://secret-user-create"));

    render(<CreateUserModal onClose={mockOnClose} assignableRoles={["student"]} />);

    fireEvent.submit(screen.getByRole("button", { name: /Создать аккаунт/i }).closest("form")!);

    expect(await screen.findByText("Не удалось создать пользователя")).toBeInTheDocument();
    expect(screen.queryByText(/secret-user-create/i)).not.toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
