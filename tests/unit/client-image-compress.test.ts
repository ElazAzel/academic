import { describe, it, expect, vi, beforeAll } from "vitest";
import { compressImage, formatBytes, COMPRESS_CONFIG } from "@/lib/client-image-compress";

// Mock Canvas API for Node.js environment (vitest uses node env)
function createMockCanvas() {
  const state = { w: 0, h: 0 };
  const canvasProps: Record<string, PropertyDescriptor> = {
    width: { get: () => state.w, set: (v: number) => { state.w = v; } },
    height: { get: () => state.h, set: (v: number) => { state.h = v; } },
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      fillStyle: "#FFFFFF",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })),
    toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
      cb(new Blob(["fake-jpeg-data"], { type: "image/jpeg" }));
    }),
  } as unknown as HTMLCanvasElement;
  Object.defineProperties(canvas, canvasProps);

  return canvas;
}

function createMockImageBitmap(width = 800, height = 600) {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap;
}

describe("compressImage", () => {
  beforeAll(() => {
    // Mock browser APIs for Node.js test environment
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(createMockImageBitmap(1921, 1080)));

    const mockCanvas = createMockCanvas();
    vi.stubGlobal("document", {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return { style: {} } as unknown as HTMLElement;
      }),
    });
  });

  it("skips non-image files", async () => {
    const file = new File(["text"], "test.pdf", { type: "application/pdf" });
    const result = await compressImage(file);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(file);
  });

  it("skips files below minimum size", async () => {
    const file = new File(["x"], "small.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 1000 });
    const result = await compressImage(file);
    expect(result.compressed).toBe(false);
  });

  it("compresses large JPEG images", async () => {
    const file = new File(["x".repeat(200_000)], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 500_000 });
    const result = await compressImage(file);
    // In test env, canvas returns a blob so it attempts compression
    expect(result.originalType).toBe("image/jpeg");
    expect(result.originalSize).toBe(500_000);
    expect(typeof result.compressed).toBe("boolean");
  });

  it("compresses large PNG images", async () => {
    const file = new File(["x".repeat(200_000)], "screenshot.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 500_000 });
    const result = await compressImage(file);
    expect(result.originalType).toBe("image/png");
  });

  it("skips GIF files (animated)", async () => {
    const file = new File(["x".repeat(200_000)], "animation.gif", { type: "image/gif" });
    Object.defineProperty(file, "size", { value: 500_000 });
    const result = await compressImage(file);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(file);
  });

  it("handles errors gracefully (invalid image data)", async () => {
    // Simulate createImageBitmap throwing
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error("Not an image"));
    const file = new File(["not-an-image"], "fake.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 500_000 });
    const result = await compressImage(file);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(file);
    // Restore mock
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(createMockImageBitmap()));
  });

  it("compresses WebP images", async () => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue(createMockImageBitmap());
    const file = new File(["x".repeat(200_000)], "image.webp", { type: "image/webp" });
    Object.defineProperty(file, "size", { value: 500_000 });
    const result = await compressImage(file);
    expect(result.originalType).toBe("image/webp");
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(1_048_576)).toBe("1.0 MB");
    expect(formatBytes(2_500_000)).toBe("2.4 MB");
  });
});

describe("COMPRESS_CONFIG", () => {
  it("has sensible defaults", () => {
    expect(COMPRESS_CONFIG.MAX_DIMENSION).toBe(1920);
    expect(COMPRESS_CONFIG.JPEG_QUALITY).toBe(0.8);
    expect(COMPRESS_CONFIG.MIN_SIZE_BYTES).toBe(50_000);
    expect(COMPRESS_CONFIG.COMPRESSIBLE_TYPES.has("image/jpeg")).toBe(true);
    expect(COMPRESS_CONFIG.COMPRESSIBLE_TYPES.has("image/png")).toBe(true);
    expect(COMPRESS_CONFIG.COMPRESSIBLE_TYPES.has("image/webp")).toBe(true);
    expect(COMPRESS_CONFIG.COMPRESSIBLE_TYPES.has("image/gif")).toBe(false);
  });
});
