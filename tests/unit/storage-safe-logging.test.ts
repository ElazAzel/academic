import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpload = vi.hoisted(() => vi.fn());
const mockCreateSignedUrl = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockCreateClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: {
    STORAGE_SUPABASE_URL: "https://storage.example.test",
    STORAGE_SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY: "access",
    S3_SECRET_KEY: "secret",
    S3_FORCE_PATH_STYLE: true,
    S3_BUCKET: "academy-media",
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

const { getSupabaseStorageSignedUrl, uploadFileToSupabase } = await import("@/lib/storage");

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    upload: mockUpload,
    createSignedUrl: mockCreateSignedUrl,
  });
  mockCreateClient.mockReturnValue({
    storage: {
      from: mockFrom,
    },
  });
});

describe("storage safe logging", () => {
  it("does not log raw Supabase upload errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUpload.mockResolvedValue({
      data: null,
      error: {
        name: "StorageApiError",
        statusCode: "500",
        message: "postgres://secret-storage-upload",
      },
    });

    const result = await uploadFileToSupabase("lesson/file.pdf", Buffer.from("file"), "application/pdf");

    expect(result).toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-storage-upload");
    expect(JSON.stringify(consoleError.mock.calls)).toContain("StorageApiError");
  });

  it("does not log raw Supabase signed URL errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: {
        name: "StorageApiError",
        statusCode: "500",
        message: "postgres://secret-storage-signed-url",
      },
    });

    const result = await getSupabaseStorageSignedUrl("academy-media", "lesson/file.pdf");

    expect(result).toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-storage-signed-url");
    expect(JSON.stringify(consoleError.mock.calls)).toContain("StorageApiError");
  });
});
