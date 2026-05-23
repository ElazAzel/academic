import { z } from "zod";
import { UPLOAD } from "@/lib/constants";
import type { Permission } from "@/lib/auth/rbac";

export const MEDIA_UPLOAD_PREFIXES = [
  "uploads",
  "covers",
  "course-builder",
  "certificates",
  "submissions",
] as const;

export type MediaUploadPrefix = (typeof MEDIA_UPLOAD_PREFIXES)[number];

const ALLOWED_CONTENT_TYPES = UPLOAD.ALLOWED_MIME_TYPES;
const MAX_FILE_SIZE = UPLOAD.MAX_FILE_SIZE_BYTES;
const MANAGED_KEY_PATTERN =
  /^(uploads|covers|course-builder|certificates|submissions)\/\d{13}-[a-f0-9]{8}(?:\.[A-Za-z0-9]{1,16})?$/;

export const mediaUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).refine(
    (value) => ALLOWED_CONTENT_TYPES.includes(value as (typeof ALLOWED_CONTENT_TYPES)[number]),
    { message: "Unsupported file type" },
  ),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE).optional(),
  prefix: z.enum(MEDIA_UPLOAD_PREFIXES).default("uploads"),
});

export const fallbackUploadParamsSchema = z.object({
  key: z.string().min(1).max(512).refine((value) => MANAGED_KEY_PATTERN.test(value), {
    message: "Unsupported storage key",
  }),
  contentType: z.string().min(1).refine(
    (value) => ALLOWED_CONTENT_TYPES.includes(value as (typeof ALLOWED_CONTENT_TYPES)[number]),
    { message: "Unsupported file type" },
  ),
});

export function parseMediaUploadPrefixFromKey(key: string): MediaUploadPrefix | null {
  const match = MANAGED_KEY_PATTERN.exec(key);
  if (!match) return null;
  return match[1] as MediaUploadPrefix;
}

export function getUploadPermissionForPrefix(prefix: MediaUploadPrefix): Permission {
  return prefix === "submissions" ? "progress:write" : "courses:write";
}

export function getUploadMaxFileSizeBytes() {
  return MAX_FILE_SIZE;
}
