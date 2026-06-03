// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mockGetCertificateTemplateAction = vi.hoisted(() => vi.fn());
const mockSaveCertificateTemplateAction = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/certificates", () => ({
  getCertificateTemplateAction: mockGetCertificateTemplateAction,
  saveCertificateTemplateAction: mockSaveCertificateTemplateAction,
}));

vi.mock("@/lib/certificate-design-history", () => ({
  useDesignHistory: () => ({
    push: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: { alt?: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

const { CertificateDesigner } = await import("@/components/admin/certificate-designer");

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveCertificateTemplateAction.mockResolvedValue({ id: "template-1" });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CertificateDesigner", () => {
  it("does not expose raw template action errors in the visible designer error state", async () => {
    mockGetCertificateTemplateAction.mockRejectedValue(new Error("postgres://secret-designer-error"));

    render(<CertificateDesigner courseId="course-1" backUrl="/admin/certificates" />);

    expect(await screen.findByText("Ошибка при получении шаблона")).toBeInTheDocument();
    expect(screen.queryByText(/secret-designer-error/i)).not.toBeInTheDocument();
  });
});
