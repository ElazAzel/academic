// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const { default: ErrorPage } = await import("@/app/error");
const { default: GlobalError } = await import("@/app/global-error");
const { ErrorFallback } = await import("@/components/lms/error-fallback");

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("error boundaries", () => {
  it("does not expose raw app error messages in visible copy or console payload", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rawError = Object.assign(new Error("postgres://secret-app-error"), {
      digest: "digest-app-1",
    });

    render(<ErrorPage error={rawError} reset={vi.fn()} />);

    expect(screen.getByText("Мы уже получили сигнал об ошибке. Попробуйте обновить страницу.")).toBeInTheDocument();
    expect(screen.getByText("digest-app-1")).toBeInTheDocument();
    expect(screen.queryByText(/secret-app-error/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-app-error");
  });

  it("does not expose raw global error messages in static markup", () => {
    const rawError = Object.assign(new Error("postgres://secret-global-error"), {
      digest: "digest-global-1",
    });

    const markup = renderToStaticMarkup(<GlobalError error={rawError} reset={vi.fn()} />);

    expect(markup).toContain("Произошла критическая ошибка приложения. Попробуйте обновить страницу.");
    expect(markup).toContain("digest-global-1");
    expect(markup).not.toContain("secret-global-error");
  });

  it("does not expose raw component fallback error messages", () => {
    const rawError = Object.assign(new Error("postgres://secret-fallback-error"), {
      digest: "digest-fallback-1",
    });

    render(<ErrorFallback error={rawError} reset={vi.fn()} />);

    expect(screen.getByText("Произошла непредвиденная ошибка. Попробуйте обновить страницу.")).toBeInTheDocument();
    expect(screen.getByText("digest-fallback-1")).toBeInTheDocument();
    expect(screen.queryByText(/secret-fallback-error/i)).not.toBeInTheDocument();
  });
});
