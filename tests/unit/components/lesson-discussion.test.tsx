// @vitest-environment jsdom
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "student-1",
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { LessonDiscussion } = await import("@/components/lms/lesson-discussion");

const emptyDiscussion = {
  lessonId: "lesson-1",
  postCount: 0,
  posts: [],
};

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...view, queryClient };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LessonDiscussion", () => {
  it("reads standard discussion API envelopes and shows the empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: emptyDiscussion }))),
    );

    renderWithQueryClient(<LessonDiscussion lessonId="lesson-1" />);

    expect(await screen.findByText("В этом уроке пока нет обсуждений.")).toBeInTheDocument();
    expect(screen.getByLabelText("Новое сообщение обсуждения")).toBeInTheDocument();
  });

  it("does not expose raw post-create exceptions in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.reject(new Error("postgres://secret-discussion-post"));
      }
      return Promise.resolve(jsonResponse({ data: emptyDiscussion }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<LessonDiscussion lessonId="lesson-1" />);

    fireEvent.change(await screen.findByLabelText("Новое сообщение обсуждения"), {
      target: { value: "Вопрос по уроку" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Опубликовать/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось отправить сообщение");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-discussion-post"));
  });

  it("preserves controlled discussion API errors in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ error: { message: "Родительский пост не найден" } }, 400),
        );
      }
      return Promise.resolve(jsonResponse({ data: emptyDiscussion }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<LessonDiscussion lessonId="lesson-1" />);

    fireEvent.change(await screen.findByLabelText("Новое сообщение обсуждения"), {
      target: { value: "Ответ на удаленный пост" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Опубликовать/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Родительский пост не найден");
    });
  });
});
