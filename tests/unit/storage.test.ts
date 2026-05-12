import { describe, expect, it } from "vitest";
import { buildStorageKey } from "@/lib/storage";

describe("storage key builder", () => {
  it("builds key with prefix and extension", () => {
    const key = buildStorageKey("lesson-media", "presentation.pdf");
    expect(key).toMatch(/^lesson-media\/\d+-[a-z0-9]+\.pdf$/);
  });

  it("builds key without extension", () => {
    const key = buildStorageKey("uploads", "noext");
    expect(key).toMatch(/^uploads\/\d+-[a-z0-9]+$/);
  });

  it("handles filenames with multiple dots", () => {
    const key = buildStorageKey("images", "photo.final.webp");
    expect(key).toMatch(/\.webp$/);
  });
});
