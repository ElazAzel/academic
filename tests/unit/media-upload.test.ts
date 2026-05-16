import { describe, expect, it } from "vitest";
import { z } from "zod";
import { UPLOAD } from "@/lib/constants";

const ALLOWED_CONTENT_TYPES = UPLOAD.ALLOWED_MIME_TYPES;
const MAX_FILE_SIZE = UPLOAD.MAX_FILE_SIZE_BYTES;

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).refine(
    (val) => ALLOWED_CONTENT_TYPES.includes(val as typeof ALLOWED_CONTENT_TYPES[number]),
    { message: "Недопустимый тип файла" }
  ),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE).optional(),
  prefix: z.string().default("uploads"),
});

describe("upload validation schema", () => {
  it("accepts valid image upload", () => {
    const result = uploadSchema.safeParse({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      fileSize: 5 * 1024 * 1024,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid PDF upload", () => {
    const result = uploadSchema.safeParse({
      filename: "doc.pdf",
      contentType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects disallowed MIME type", () => {
    const result = uploadSchema.safeParse({
      filename: "script.exe",
      contentType: "application/x-msdownload",
    });
    expect(result.success).toBe(false);
  });

  it("rejects file exceeding max size", () => {
    const result = uploadSchema.safeParse({
      filename: "huge.mp4",
      contentType: "video/mp4",
      fileSize: MAX_FILE_SIZE + 1,
    });
    expect(result.success).toBe(false);
  });

  it("allows file at exact max size boundary", () => {
    const result = uploadSchema.safeParse({
      filename: "exact.mp4",
      contentType: "video/mp4",
      fileSize: MAX_FILE_SIZE,
    });
    expect(result.success).toBe(true);
  });

  it("defaults prefix to uploads", () => {
    const result = uploadSchema.safeParse({
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
      const result = uploadSchema.safeParse({
        filename: `file.${mime.split("/")[1]}`,
        contentType: mime,
        fileSize: 100,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty filename", () => {
    const result = uploadSchema.safeParse({
      filename: "",
      contentType: "image/jpeg",
    });
    expect(result.success).toBe(false);
  });
});
