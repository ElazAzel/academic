// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportDesigner } from "@/components/lms/report-designer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function openDesigner() {
  fireEvent.click(screen.getByRole("button"));
}

function getDownloadUrl(container: HTMLElement) {
  const link = container.querySelector<HTMLAnchorElement>('a[download][href^="/api/v1/reports"]');
  expect(link).not.toBeNull();
  return new URL(link?.getAttribute("href") ?? "", "https://academy.test");
}

describe("ReportDesigner", () => {
  it("keeps certificate status and revocation date selected by default", () => {
    const { container } = render(
      <ReportDesigner defaultType="certificates" userRoles={["customer_observer"]} />,
    );

    openDesigner();

    const downloadUrl = getDownloadUrl(container);
    expect(downloadUrl.searchParams.get("type")).toBe("certificates");
    expect(downloadUrl.searchParams.get("fields")?.split(",")).toEqual([
      "number",
      "studentName",
      "email",
      "course",
      "issuedAt",
      "status",
      "revokedAt",
    ]);
  });

  it("does not keep a forbidden default report type for customer observers", () => {
    const { container } = render(
      <ReportDesigner defaultType="assignments" userRoles={["customer_observer"]} />,
    );

    openDesigner();

    const downloadUrl = getDownloadUrl(container);
    expect(downloadUrl.searchParams.get("type")).toBe("progress");
    expect(downloadUrl.searchParams.get("type")).not.toBe("assignments");
  });

  it("hides report controls when no report type is allowed for the role", () => {
    const { container } = render(<ReportDesigner defaultType="progress" userRoles={["student"]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("labels bounded previews as a limited sample when the row cap is reached", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            previewRows: [{ studentName: "Иван", email: "ivan@example.test" }],
            totalRowsCount: 5000,
            isTruncated: true,
            rowLimit: 5000,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<ReportDesigner defaultType="progress" userRoles={["admin"]} />);
    openDesigner();

    fireEvent.click(screen.getByRole("button", { name: /превью/i }));

    expect(await screen.findByText("Показано строк: 5000 из лимита 5000")).toBeInTheDocument();
  });

  it("shows controlled preview API errors from the standard error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: "Слишком много запросов. Попробуйте позже." },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<ReportDesigner defaultType="progress" userRoles={["admin"]} />);
    openDesigner();

    fireEvent.click(screen.getByRole("button", { name: /превью/i }));

    expect(await screen.findByText("Слишком много запросов. Попробуйте позже.")).toBeInTheDocument();
  });

  it("does not expose raw network errors in the preview panel", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("postgres://secret-report-preview"));

    render(<ReportDesigner defaultType="progress" userRoles={["admin"]} />);
    openDesigner();

    fireEvent.click(screen.getByRole("button", { name: /превью/i }));

    expect(await screen.findByText("Не удалось загрузить предварительный просмотр")).toBeInTheDocument();
    expect(screen.queryByText(/secret-report-preview/i)).not.toBeInTheDocument();
  });
});
