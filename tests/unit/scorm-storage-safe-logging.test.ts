import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpload = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockGetStorageClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getStorageClient: mockGetStorageClient,
  };
});

const { uploadScormFile } = await import("@/server/modules/scorm/storage");

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    upload: mockUpload,
  });
  mockGetStorageClient.mockReturnValue({
    storage: {
      from: mockFrom,
    },
  });
});

describe("SCORM storage safe logging", () => {
  it("does not log raw provider upload errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUpload.mockResolvedValue({
      data: null,
      error: {
        name: "StorageApiError",
        statusCode: "500",
        message: "postgres://secret-scorm-storage",
      },
    });

    const result = await uploadScormFile(
      "package-1",
      "index.html",
      Buffer.from("<html></html>"),
      "text/html",
    );

    expect(result).toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-scorm-storage");
    expect(JSON.stringify(consoleError.mock.calls)).toContain("StorageApiError");
  });
});
