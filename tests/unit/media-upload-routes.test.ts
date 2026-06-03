import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCreatePresignedUploadUrl = vi.hoisted(() => vi.fn());
const mockBuildStorageKey = vi.hoisted(() => vi.fn());
const mockUploadFileToSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/storage", () => ({
  buildStorageKey: mockBuildStorageKey,
  createPresignedUploadUrl: mockCreatePresignedUploadUrl,
  uploadFileToSupabase: mockUploadFileToSupabase,
}));

import { POST as createUploadUrl } from "@/app/api/v1/media/uploads/route";
import { PUT as uploadFallback } from "@/app/api/v1/media/upload-fallback/route";
import { UPLOAD } from "@/lib/constants";

describe("media upload routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", email: "user@test.com", roles: ["student"] });
    mockBuildStorageKey.mockImplementation((prefix: string, filename: string) => `${prefix}/1710000000000-abcdef12.${filename.split(".").pop()}`);
    mockCreatePresignedUploadUrl.mockResolvedValue({
      url: "https://storage.example/upload",
      publicUrl: "https://storage.example/public/file.pdf",
    });
    mockUploadFileToSupabase.mockResolvedValue("https://storage.example/public/file.pdf");
  });

  it("requires progress write permission for submission uploads", async () => {
    const response = await createUploadUrl(new Request("http://localhost/api/v1/media/uploads", {
      method: "POST",
      body: JSON.stringify({
        filename: "work.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        prefix: "submissions",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("progress:write");
    expect(mockBuildStorageKey).toHaveBeenCalledWith("submissions", "work.pdf");
  });

  it("requires course write permission for builder uploads", async () => {
    const response = await createUploadUrl(new Request("http://localhost/api/v1/media/uploads", {
      method: "POST",
      body: JSON.stringify({
        filename: "cover.png",
        contentType: "image/png",
        fileSize: 1024,
        prefix: "covers",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockBuildStorageKey).toHaveBeenCalledWith("covers", "cover.png");
  });

  it("returns a same-origin fallback URL with presigned uploads", async () => {
    const response = await createUploadUrl(new Request("http://localhost/api/v1/media/uploads", {
      method: "POST",
      body: JSON.stringify({
        filename: "certificate-background.png",
        contentType: "image/png",
        fileSize: 1024,
        prefix: "certificates",
      }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.url).toBe("https://storage.example/upload");
    expect(data.data.fallbackUrl).toContain("/api/v1/media/upload-fallback");
    expect(data.data.fallbackUrl).toContain("certificates%2F1710000000000-abcdef12.png");
  });

  it("returns Supabase fallback upload URL for certificate PNG backgrounds when S3 is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockCreatePresignedUploadUrl.mockResolvedValueOnce(null);

    const response = await createUploadUrl(new Request("http://localhost/api/v1/media/uploads", {
      method: "POST",
      body: JSON.stringify({
        filename: "certificate-background.png",
        contentType: "image/png",
        fileSize: 1024,
        prefix: "certificates",
      }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockBuildStorageKey).toHaveBeenCalledWith("certificates", "certificate-background.png");
    expect(data.data.url).toContain("/api/v1/media/upload-fallback");
    expect(data.data.publicUrl).toContain("/storage/v1/object/public/academy-media/certificates/");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[Storage Fallback] S3 offline"));
    consoleSpy.mockRestore();
  });

  it("applies the same permission policy in fallback uploads", async () => {
    const response = await uploadFallback(new Request(
      "http://localhost/api/v1/media/upload-fallback?key=submissions/1710000000000-abcdef12.pdf&contentType=application/pdf",
      {
        method: "PUT",
        body: "file-content",
        headers: { "content-length": "12" },
      },
    ));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRequireUser).toHaveBeenCalledWith("progress:write");
    expect(mockUploadFileToSupabase).toHaveBeenCalledWith(
      "submissions/1710000000000-abcdef12.pdf",
      expect.any(Buffer),
      "application/pdf",
    );
  });

  it("rejects fallback uploads with unmanaged keys before storage write", async () => {
    const response = await uploadFallback(new Request(
      "http://localhost/api/v1/media/upload-fallback?key=avatars/1710000000000-abcdef12.png&contentType=image/png",
      { method: "PUT", body: "file-content" },
    ));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.message).toBe("Некорректные данные запроса");
    expect(mockRequireUser).not.toHaveBeenCalled();
    expect(mockUploadFileToSupabase).not.toHaveBeenCalled();
  });

  it("rejects fallback uploads over the file size limit before reading the body", async () => {
    const response = await uploadFallback(new Request(
      "http://localhost/api/v1/media/upload-fallback?key=covers/1710000000000-abcdef12.png&contentType=image/png",
      {
        method: "PUT",
        body: "x",
        headers: { "content-length": String(UPLOAD.MAX_FILE_SIZE_BYTES + 1) },
      },
    ));
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error.message).toBe("Файл слишком большой");
    expect(mockUploadFileToSupabase).not.toHaveBeenCalled();
  });

  it("rejects empty fallback uploads with a Russian error", async () => {
    const response = await uploadFallback(new Request(
      "http://localhost/api/v1/media/upload-fallback?key=covers/1710000000000-abcdef12.png&contentType=image/png",
      { method: "PUT", body: "" },
    ));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.message).toBe("Файл пустой");
    expect(mockUploadFileToSupabase).not.toHaveBeenCalled();
  });

  it("returns a Russian service error when fallback storage upload fails", async () => {
    mockUploadFileToSupabase.mockResolvedValueOnce(null);

    const response = await uploadFallback(new Request(
      "http://localhost/api/v1/media/upload-fallback?key=covers/1710000000000-abcdef12.png&contentType=image/png",
      { method: "PUT", body: "file-content", headers: { "content-length": "12" } },
    ));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error.message).toBe("Не удалось загрузить файл в хранилище");
  });
});
