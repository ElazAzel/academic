import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCompressImage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/client-image-compress", () => ({
  compressImage: mockCompressImage,
  formatBytes: (bytes: number) => `${bytes} B`,
}));

describe("uploadMedia", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCompressImage.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads enveloped upload tickets and uses the fallback PUT public URL when present", async () => {
    const file = new File(["png-bytes"], "background.png", { type: "image/png" });
    mockCompressImage.mockResolvedValue({
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
      originalType: file.type,
      finalType: file.type,
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          url: "/api/v1/media/upload-fallback?key=certificates/1710000000000-abcdef12.png&contentType=image%2Fpng",
          publicUrl: "https://storage.example/initial.png",
          key: "certificates/1710000000000-abcdef12.png",
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        publicUrl: "https://storage.example/fallback.png",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { uploadMedia } = await import("@/lib/upload-with-compress");
    const result = await uploadMedia(file, "certificates");

    expect(result.publicUrl).toBe("https://storage.example/fallback.png");
    expect(result.storageKey).toBe("certificates/1710000000000-abcdef12.png");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/media/uploads",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          filename: "background.png",
          contentType: "image/png",
          fileSize: file.size,
          prefix: "certificates",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/media/upload-fallback?key=certificates/1710000000000-abcdef12.png&contentType=image%2Fpng",
      expect.objectContaining({
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/png" },
      }),
    );
  });

  it("retries the same-origin fallback URL when direct storage PUT fails", async () => {
    const file = new File(["png-bytes"], "background.png", { type: "image/png" });
    mockCompressImage.mockResolvedValue({
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
      originalType: file.type,
      finalType: file.type,
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          url: "https://storage.example/upload",
          publicUrl: "https://storage.example/initial.png",
          fallbackUrl: "/api/v1/media/upload-fallback?key=certificates/1710000000000-abcdef12.png&contentType=image%2Fpng",
          key: "certificates/1710000000000-abcdef12.png",
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        publicUrl: "https://storage.example/fallback.png",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { uploadMedia } = await import("@/lib/upload-with-compress");
    const result = await uploadMedia(file, "certificates");

    expect(result.publicUrl).toBe("https://storage.example/fallback.png");
    expect(result.storageKey).toBe("certificates/1710000000000-abcdef12.png");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://storage.example/upload",
      expect.objectContaining({ method: "PUT", body: file }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/media/upload-fallback?key=certificates/1710000000000-abcdef12.png&contentType=image%2Fpng",
      expect.objectContaining({ method: "PUT", body: file }),
    );
  });
});
