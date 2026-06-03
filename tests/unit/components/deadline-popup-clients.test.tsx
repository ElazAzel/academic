// @vitest-environment jsdom
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { DeadlineManager } = await import("@/app/admin/cohorts/[cohortId]/deadline-manager");
const { InstructorDeadlinesClient } = await import("@/app/instructor/deadlines/client");
const { AdminPopupManagerClient } = await import("@/app/admin/popups/client");
const { CuratorPopupClient } = await import("@/app/curator/popups/client");

const blockDeadline = {
  id: "block-1",
  targetType: "block",
  title: "Вводный блок",
  order: 1,
  moduleId: "module-1",
  moduleTitle: "Первый модуль",
  moduleOrder: 1,
  deadline: null,
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

describe("deadline clients", () => {
  it("does not expose raw admin deadline save exceptions in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/block-deadlines") && init?.method === "POST") {
        return Promise.reject(new Error("postgres://secret-deadline-save"));
      }
      if (url.includes("/block-deadlines")) {
        return Promise.resolve(jsonResponse({ data: [blockDeadline] }));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<DeadlineManager cohortId="cohort-1" cohortName="Поток 1" />);

    fireEvent.change(await screen.findByLabelText("Дата дедлайна для блока Вводный блок"), {
      target: { value: "2026-06-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Сохранить дедлайны/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось сохранить дедлайны");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-deadline-save"));
  });

  it("does not expose raw instructor deadline save exceptions in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/block-deadlines") && init?.method === "POST") {
        return Promise.reject(new Error("postgres://secret-instructor-deadline"));
      }
      if (url.includes("/block-deadlines")) {
        return Promise.resolve(jsonResponse({ data: [blockDeadline] }));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<InstructorDeadlinesClient cohortId="cohort-1" cohortName="Поток 1" />);

    fireEvent.change(await screen.findByLabelText("Дата дедлайна для блока Вводный блок"), {
      target: { value: "2026-06-10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Сохранить$/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось сохранить дедлайны");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-instructor-deadline"));
  });
});

describe("popup clients", () => {
  it("does not expose raw admin popup create exceptions in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/popups") && init?.method === "POST") {
        return Promise.reject(new Error("postgres://secret-popup-create"));
      }
      if (url.endsWith("/api/v1/popups") || url.endsWith("/api/v1/cohorts")) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<AdminPopupManagerClient />);

    fireEvent.click(screen.getByRole("button", { name: /Создать попап/i }));
    fireEvent.change(screen.getByPlaceholderText("Например: Важное объявление"), {
      target: { value: "Важное объявление" },
    });
    fireEvent.change(screen.getByPlaceholderText("Текст попапа..."), {
      target: { value: "Проверьте новый материал" },
    });

    const roleButton = screen.getByRole("button", { name: "Выбрать роль Администратор" });
    fireEvent.click(roleButton);
    expect(roleButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Отправить попап/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось отправить попап");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-popup-create"));
  });

  it("does not expose raw curator popup create exceptions in toast copy", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/popups") && init?.method === "POST") {
        return Promise.reject(new Error("postgres://secret-curator-popup"));
      }
      if (url.endsWith("/api/v1/popups")) {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      <CuratorPopupClient
        curatorId="curator-1"
        students={[
          {
            id: "student-1",
            name: "Слушатель",
            email: "student@example.test",
            cohortName: "Поток 1",
            courseTitle: "Курс",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Создать уведомление/i }));

    const studentButton = screen.getByRole("button", { name: "Выбрать слушателя Слушатель" });
    fireEvent.click(studentButton);
    expect(studentButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByPlaceholderText("Например: Напоминание о задании"), {
      target: { value: "Напоминание" },
    });
    fireEvent.change(screen.getByPlaceholderText("Текст уведомления..."), {
      target: { value: "Проверьте дедлайн" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Отправить уведомление/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось отправить уведомление");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-curator-popup"));
  });
});
