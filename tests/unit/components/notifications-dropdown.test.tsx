// @vitest-environment jsdom
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const mockPush = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockSetNotifications = vi.hoisted(() => vi.fn());

const mockNotificationsState = vi.hoisted(() => ({
  notifications: [
    {
      id: "notification-1",
      title: "Ответ куратора",
      body: "Куратор ответил на вопрос",
      type: "new_message",
      refType: "message",
      refId: "lesson-1",
      data: { link: "/student/lessons/lesson-1" },
      readAt: null,
      createdAt: "2026-06-03T10:00:00.000Z",
    },
  ],
  unreadCount: 1,
  loading: false,
  setNotifications: mockSetNotifications,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => mockNotificationsState,
}));

vi.mock("@/components/lms/popup-notification-viewer", () => ({
  PopupNotificationViewer: () => null,
}));

const { NotificationsDropdown } = await import("@/components/lms/notifications-dropdown");

async function openDropdown() {
  render(<NotificationsDropdown />);
  await userEvent.click(screen.getByRole("button", { name: /уведомления/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("NotificationsDropdown", () => {
  it("does not log raw mark-all response bodies", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("postgres://secret-notification-dropdown-response", {
          status: 500,
        }),
      ),
    );

    await openDropdown();
    await userEvent.click(await screen.findByRole("button", { name: /прочитать все/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось отметить уведомления как прочитанные");
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-notification-dropdown-response");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[NotificationsDropdown] Failed to mark all as read",
      { statusCode: 500 },
    );
    expect(mockSetNotifications).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("does not log raw mark-all network errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("postgres://secret-notification-dropdown-network")));

    await openDropdown();
    await userEvent.click(await screen.findByRole("button", { name: /прочитать все/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось отметить уведомления как прочитанные");
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-notification-dropdown-network");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[NotificationsDropdown] Failed to mark all as read",
      expect.objectContaining({ errorType: "Error" }),
    );
    expect(mockSetNotifications).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
