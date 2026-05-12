import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

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
