import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  return s3Client;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<{ url: string; publicUrl: string }> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const publicUrl = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
  return { url, publicUrl };
}

export function buildStorageKey(prefix: string, filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "";
  const safeName = `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext ? `.${ext}` : ""}`;
  return safeName;
}

export async function createSignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function getSupabaseStorageSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function getSupabaseStorageSignedUrlAsync(
  bucket: string,
  path: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
