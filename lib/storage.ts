import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let s3Client: S3Client | null = null;
let supabaseStorageClient: ReturnType<typeof createClient> | null = null;
let supabaseStorageChecked = false;
let s3AvailabilityCache: { checkedAt: number; available: boolean } | null = null;

const BUCKET = "academy-media";
const S3_AVAILABILITY_CACHE_MS = 30_000;

export function getStorageClient() {
  if (supabaseStorageChecked) return supabaseStorageClient;

  const supabaseUrl = env.STORAGE_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || process.env.storage_SUPABASE_URL;
  const supabaseServiceKey = env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || process.env.storage_SUPABASE_SERVICE_ROLE_KEY;

  supabaseStorageChecked = true;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[Storage] Supabase Storage credentials not configured (STORAGE_SUPABASE_URL / STORAGE_SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }

  supabaseStorageClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  return supabaseStorageClient;
}

// ─── S3 (MinIO) — fallback ─────────────────────────────────────────────

export function getS3Client(): S3Client | null {
  try {
    if (!s3Client) {
      s3Client = new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY,
          secretAccessKey: env.S3_SECRET_KEY,
        },
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        requestHandler: { requestTimeout: 3_000 },
      });
    }
    return s3Client;
  } catch {
    return null;
  }
}

async function isS3BucketAvailable(client: S3Client): Promise<boolean> {
  const now = Date.now();
  if (s3AvailabilityCache && now - s3AvailabilityCache.checkedAt < S3_AVAILABILITY_CACHE_MS) {
    return s3AvailabilityCache.available;
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    s3AvailabilityCache = { checkedAt: now, available: true };
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Storage] S3 bucket unavailable, using upload fallback: ${message}`);
    s3AvailabilityCache = { checkedAt: now, available: false };
    return false;
  }
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<{ url: string; publicUrl: string } | null> {
  try {
    const client = getS3Client();
    if (!client) return null;
    if (!(await isS3BucketAvailable(client))) return null;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    const publicUrl = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
    return { url, publicUrl };
  } catch {
    return null;
  }
}

export function buildStorageKey(prefix: string, filename: string): string {
  const rawExt = filename.includes(".") ? filename.split(".").pop() : "";
  const ext = rawExt && /^[a-zA-Z0-9]{1,16}$/.test(rawExt) ? rawExt.toLowerCase() : "";
  const safeName = `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext ? `.${ext}` : ""}`;
  return safeName;
}

export async function createSignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  try {
    const client = getS3Client();
    if (!client) return null;
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch {
    return null;
  }
}

// ─── Supabase Storage — основной провайдер ─────────────────────────────

/**
 * Загружает файл в Supabase Storage, возвращает публичный URL.
 */
export async function uploadFileToSupabase(
  path: string,
  file: File | Blob | Buffer | ArrayBuffer,
  contentType?: string,
): Promise<string | null> {
  try {
    const client = getStorageClient();
    if (!client) {
      console.error("[Storage] Supabase Storage client not available — upload skipped");
      return null;
    }

    const resolvedContentType = contentType || (file instanceof Blob ? file.type : undefined) || "application/octet-stream";

    const { data, error } = await client.storage.from(BUCKET).upload(path, file, {
      contentType: resolvedContentType,
      upsert: true,
    });

    if (error) {
      console.error("[Storage] Supabase upload error:", error.message, error);
      return null;
    }

    if (!data?.path) {
      console.error("[Storage] Supabase upload returned no path");
      return null;
    }

    const supabaseUrl = env.STORAGE_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || process.env.storage_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${data.path}`;
  } catch (err) {
    console.error("[Storage] Supabase upload exception:", err);
    return null;
  }
}

/**
 * Создаёт подписанную ссылку на скачивание (Supabase Storage).
 */
export async function getSupabaseStorageSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  try {
    const client = getStorageClient();
    if (!client) return null;

    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) {
      console.error("[Storage] Supabase signed URL error:", error.message);
      return null;
    }
    if (!data?.signedUrl) return null;

    return data.signedUrl;
  } catch (err) {
    console.error("[Storage] Supabase signed URL exception:", err);
    return null;
  }
}
