/**
 * Client-side image compression utility.
 *
 * Compresses images before upload to reduce bandwidth & storage.
 * - Resizes to max 1920px on the longest side
 * - Converts to JPEG at 80% quality (PNG/WebP → JPEG for photos)
 * - Skips GIF (animation), PDF, DOC and other non-image types
 * - Returns the original file if compression is not applicable
 */

export const COMPRESS_CONFIG = {
  /** Maximum width or height in pixels */
  MAX_DIMENSION: 1920,
  /** JPEG quality 0–1 */
  JPEG_QUALITY: 0.8,
  /** Minimum file size in bytes to attempt compression (skip tiny files) */
  MIN_SIZE_BYTES: 50_000,
  /** Image MIME types that can be compressed */
  COMPRESSIBLE_TYPES: new Set(["image/jpeg", "image/png", "image/webp"]),
} as const;

export interface CompressResult {
  /** The (possibly compressed) file ready for upload */
  file: File;
  /** Original MIME type before compression */
  originalType: string;
  /** True if compression was actually applied */
  compressed: boolean;
  /** Size before compression in bytes */
  originalSize: number;
  /** Size after compression in bytes */
  finalSize: number;
}

/**
 * Compress an image file if it qualifies.
 *
 * @param file - The file selected by the user
 * @returns CompressResult with the (possibly compressed) file
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;
  const originalType = file.type;

  // Skip non-images, GIFs (animation), and files below threshold
  if (
    !COMPRESS_CONFIG.COMPRESSIBLE_TYPES.has(file.type) ||
    file.size < COMPRESS_CONFIG.MIN_SIZE_BYTES
  ) {
    return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const { width: outW, height: outH } = calculateDimensions(width, height);

    // Skip if the image is already small enough
    if (outW === width && outH === height && file.size < 300_000) {
      bitmap.close();
      return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
    }

    // White background for JPEG (handles PNG transparency)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", COMPRESS_CONFIG.JPEG_QUALITY),
    );
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) {
      return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
    }

    // Only use compressed version if it's actually smaller
    if (blob.size >= originalSize) {
      return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
    }

    // Preserve original extension in name but content is JPEG
    const compressedFile = new File([blob], renameToJpg(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalType,
      compressed: true,
      originalSize,
      finalSize: blob.size,
    };
  } catch {
    // If anything fails (e.g. the file is not actually an image),
    // return the original file
    return { file, originalType, compressed: false, originalSize, finalSize: originalSize };
  }
}

function calculateDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const max = COMPRESS_CONFIG.MAX_DIMENSION;
  if (width <= max && height <= max) return { width, height };

  const ratio = Math.min(max / width, max / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function renameToJpg(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const name = dot > 0 ? filename.slice(0, dot) : filename;
  return `${name}.jpg`;
}

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
