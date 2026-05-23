import { describe, expect, it } from "vitest";
import { UPLOAD } from "@/lib/constants";
import {
  fallbackUploadParamsSchema,
  getUploadPermissionForPrefix,
  mediaUploadSchema,
  parseMediaUploadPrefixFromKey,
} from "@/lib/media-upload-policy";

const ALLOWED_CONTENT_TYPES = UPLOAD.ALLOWED_MIME_TYPES;
const MAX_FILE_SIZE = UPLOAD.MAX_FILE_SIZE_BYTES;

describe("upload validation schema", () => {
  it("accepts valid image upload", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      fileSize: 5 * 1024 * 1024,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid PDF upload", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "doc.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects disallowed MIME type", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "script.exe",
      contentType: "application/x-msdownload",
    });
    expect(result.success).toBe(false);
  });

  it("rejects file exceeding max size", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "huge.mp4",
      contentType: "video/mp4",
      fileSize: MAX_FILE_SIZE + 1,
    });
    expect(result.success).toBe(false);
  });

  it("allows file at exact max size boundary", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "exact.mp4",
      contentType: "video/mp4",
      fileSize: MAX_FILE_SIZE,
    });
    expect(result.success).toBe(true);
  });

  it("defaults prefix to uploads", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "file.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prefix).toBe("uploads");
    }
  });

  it("accepts all allowed MIME types from constants", () => {
    for (const mime of ALLOWED_CONTENT_TYPES) {
      const result = mediaUploadSchema.safeParse({
        filename: `file.${mime.split("/")[1]}`,
        contentType: mime,
        fileSize: 100,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty filename", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "",
      contentType: "image/jpeg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsafe upload prefixes", () => {
    const result = mediaUploadSchema.safeParse({
      filename: "file.pdf",
      contentType: "application/pdf",
      prefix: "../private",
    });
    expect(result.success).toBe(false);
  });
});

describe("fallback upload policy", () => {
  it("accepts generated managed storage keys", () => {
    const result = fallbackUploadParamsSchema.safeParse({
      key: "submissions/1710000000000-abcdef12.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects path traversal storage keys", () => {
    const result = fallbackUploadParamsSchema.safeParse({
      key: "submissions/../../secret.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unmanaged prefixes", () => {
    const result = fallbackUploadParamsSchema.safeParse({
      key: "avatars/1710000000000-abcdef12.png",
      contentType: "image/png",
    });
    expect(result.success).toBe(false);
  });

  it("extracts prefix only from managed keys", () => {
    expect(parseMediaUploadPrefixFromKey("covers/1710000000000-abcdef12.png")).toBe("covers");
    expect(parseMediaUploadPrefixFromKey("covers/custom-name.png")).toBeNull();
  });

  it("maps student submissions to progress write and builder uploads to course write", () => {
    expect(getUploadPermissionForPrefix("submissions")).toBe("progress:write");
    expect(getUploadPermissionForPrefix("covers")).toBe("courses:write");
    expect(getUploadPermissionForPrefix("course-builder")).toBe("courses:write");
    expect(getUploadPermissionForPrefix("certificates")).toBe("courses:write");
  });
});
