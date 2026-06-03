// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { NotificationPreferencesForm } = await import("@/components/lms/notification-preferences-form");

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <NotificationPreferencesForm />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("NotificationPreferencesForm", () => {
  it("does not expose raw preference mutation errors in toast copy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { curator_reply: false } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockRejectedValueOnce(new Error("postgres://secret-notification-preference"));

    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient();

    fireEvent.click(await screen.findByRole("switch", { name: /Ответ куратора/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось сохранить настройку уведомлений");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-notification-preference"));
  });
});
