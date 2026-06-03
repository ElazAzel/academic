// @vitest-environment jsdom
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const mockToastError = vi.hoisted(() => vi.fn());
const mockSession = vi.hoisted(() => ({ user: { id: "student-1" } }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: mockSession,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}));

const { ConsentModal } = await import("@/components/lms/consent-modal");
const { PopupModal } = await import("@/components/lms/popup-modal");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("modal acknowledgement errors", () => {
  it("does not log raw consent accept network errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { consented: false } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockRejectedValueOnce(new Error("postgres://secret-consent-accept")),
    );

    render(<ConsentModal />);
    await userEvent.click(await screen.findByRole("button", { name: /принимаю условия/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось подтвердить согласие");
    });
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-consent-accept");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ConsentModal] Failed to accept consent",
      expect.objectContaining({ errorType: "Error" }),
    );
    consoleSpy.mockRestore();
  });

  it("keeps popup open and does not log raw acknowledge response bodies", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                id: "popup-1",
                title: "Важное сообщение",
                message: "Нужно подтвердить просмотр",
                imageUrl: null,
                linkUrl: null,
                linkText: null,
                viewed: false,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response("postgres://secret-popup-acknowledge-response", {
            status: 500,
          }),
        ),
    );

    render(<PopupModal />);
    expect(await screen.findByText("Важное сообщение")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /принято/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось подтвердить сообщение");
    });
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-popup-acknowledge-response");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[PopupModal] Failed to acknowledge popup",
      { statusCode: 500 },
    );
    expect(screen.getByText("Важное сообщение")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
