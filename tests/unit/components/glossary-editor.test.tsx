// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockCreateGlossaryEntryAction = vi.hoisted(() => vi.fn());
const mockUpdateGlossaryEntryAction = vi.hoisted(() => vi.fn());
const mockDeleteGlossaryEntryAction = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/glossary", () => ({
  createGlossaryEntryAction: mockCreateGlossaryEntryAction,
  updateGlossaryEntryAction: mockUpdateGlossaryEntryAction,
  deleteGlossaryEntryAction: mockDeleteGlossaryEntryAction,
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

const { GlossaryEditor } = await import("@/app/admin/glossary/glossary-editor");

function renderGlossaryEditor() {
  render(
    <GlossaryEditor
      entries={[
        {
          id: "entry-1",
          question: "Что такое дедлайн?",
          answer: "Срок сдачи задания.",
          category: "Общее",
          direction: "general",
        },
      ]}
      categories={["Общее"]}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateGlossaryEntryAction.mockResolvedValue({ success: true });
  mockUpdateGlossaryEntryAction.mockResolvedValue({ success: true });
  mockDeleteGlossaryEntryAction.mockResolvedValue({ success: true });
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GlossaryEditor", () => {
  it("shows controlled glossary action result errors", async () => {
    mockDeleteGlossaryEntryAction.mockResolvedValue({ success: false, error: "ID записи обязателен" });

    renderGlossaryEditor();

    fireEvent.click(screen.getByRole("button", { name: /Удалить/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("ID записи обязателен");
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("does not expose raw glossary action exceptions in toast copy", async () => {
    mockDeleteGlossaryEntryAction.mockRejectedValue(new Error("postgres://secret-glossary-delete"));

    renderGlossaryEditor();

    fireEvent.click(screen.getByRole("button", { name: /Удалить/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось удалить запись глоссария");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-glossary-delete"));
  });
});
