import { getStorageClient, getStorageErrorMetadata } from "@/lib/storage";

const SCORM_BUCKET = "scorm-packages";

export async function uploadScormFile(
  packageId: string,
  relativePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const client = getStorageClient();
  if (!client) return null;

  const storagePath = `${packageId}/${relativePath}`;
  const { error } = await client.storage.from(SCORM_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error("[ScormStorage] Upload error", getStorageErrorMetadata(error));
    return null;
  }
  return storagePath;
}

export async function deleteScormDirectory(packageId: string): Promise<boolean> {
  const client = getStorageClient();
  if (!client) return false;

  const { data, error: listError } = await client.storage.from(SCORM_BUCKET).list(packageId);
  if (listError || !data?.length) {
    const { error } = await client.storage.from(SCORM_BUCKET).remove([packageId]);
    return !error;
  }

  const files = data.map((f) => `${packageId}/${f.name}`);
  const { error } = await client.storage.from(SCORM_BUCKET).remove(files);
  return !error;
}

export async function downloadScormFile(storagePath: string): Promise<{ data: ReadableStream; contentType: string } | null> {
  const client = getStorageClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(SCORM_BUCKET).download(storagePath);
  if (error || !data) return null;

  return { data: data.stream(), contentType: data.type || "application/octet-stream" };
}
