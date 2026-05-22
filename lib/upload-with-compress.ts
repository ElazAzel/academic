/**
 * Shared upload wrapper with auto image compression.
 *
 * Usage:
 *   const result = await uploadMedia(file, "covers");
 *   // result.publicUrl — URL to use
 */

import { compressImage, formatBytes } from "@/lib/client-image-compress";

export interface UploadMediaResult {
  publicUrl: string;
  fileName: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

/**
 * Upload a file via the presigned URL flow with auto image compression.
 * Works for course covers, lesson media, assignment submissions, etc.
 */
export async function uploadMedia(
  file: File,
  prefix = "uploads",
): Promise<UploadMediaResult> {
  // 1. Compress if it's an image
  const result = await compressImage(file);
  const uploadFile = result.file;

  if (result.compressed) {
    const saved = result.originalSize - result.finalSize;
    const pct = Math.round((saved / result.originalSize) * 100);
    console.log(
      `[Compress] ${file.name}: ${formatBytes(result.originalSize)} → ${formatBytes(result.finalSize)} (−${pct}%)`,
    );
  }

  // 2. Get presigned URL
  const presignRes = await fetch("/api/v1/media/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: uploadFile.name,
      contentType: uploadFile.type,
      fileSize: uploadFile.size,
      prefix,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error?.message ?? "Ошибка при подготовке загрузки");
  }

  const { url, publicUrl } = await presignRes.json();

  // 3. Upload compressed file to S3/MinIO
  const uploadRes = await fetch(url, {
    method: "PUT",
    body: uploadFile,
    headers: { "Content-Type": uploadFile.type },
  });

  if (!uploadRes.ok) {
    throw new Error("Ошибка при загрузке файла");
  }

  return {
    publicUrl,
    fileName: uploadFile.name,
    compressed: result.compressed,
    originalSize: result.originalSize,
    finalSize: result.finalSize,
  };
}

/**
 * Upload a file to chat with auto image compression.
 */
export async function uploadChatFile(file: File): Promise<{
  publicUrl: string;
  attachmentType: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}> {
  const result = await compressImage(file);
  const uploadFile = result.file;

  if (result.compressed) {
    const saved = result.originalSize - result.finalSize;
    const pct = Math.round((saved / result.originalSize) * 100);
    console.log(
      `[Compress] ${file.name}: ${formatBytes(result.originalSize)} → ${formatBytes(result.finalSize)} (−${pct}%)`,
    );
  }

  const body = new FormData();
  body.append("file", uploadFile);
  const res = await fetch("/api/v1/chat/upload", { method: "POST", body });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Upload failed");
  }

  const json = await res.json();
  return {
    publicUrl: json.publicUrl,
    attachmentType: json.attachmentType ?? uploadFile.type,
    compressed: result.compressed,
    originalSize: result.originalSize,
    finalSize: result.finalSize,
  };
}
