import { getPrisma } from "@/lib/prisma";
import { UPLOAD } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { parseManifest } from "./manifest-parser";
import { uploadScormFile } from "./storage";
import { createId } from "@paralleldrive/cuid2";
import AdmZip from "adm-zip";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html", ".htm": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "text/xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".swf": "application/x-shockwave-flash",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? MIME_MAP[`.${ext}`] || "application/octet-stream" : "application/octet-stream";
}

export async function importScormPackage(lessonId: string, zipBuffer: Buffer) {
  const prisma = getPrisma();

  if (zipBuffer.length > UPLOAD.SCORM_MAX_SIZE_BYTES) {
    throw new ApiError("bad_request", "ZIP-файл превышает лимит 200MB", 413);
  }

  const existing = await prisma.scormPackage.findUnique({ where: { lessonId } });
  if (existing) {
    throw new ApiError("conflict", "Урок уже имеет SCORM-пакет. Удалите существующий перед загрузкой.", 409);
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new ApiError("bad_request", "Ошибка распаковки ZIP — файл повреждён", 422);
  }

  const manifestEntry = zip.getEntry("imsmanifest.xml");
  if (!manifestEntry) {
    throw new ApiError("bad_request", "ZIP не является SCORM-пакетом: отсутствует imsmanifest.xml", 422);
  }

  let manifest: ReturnType<typeof parseManifest>;
  try {
    manifest = parseManifest(manifestEntry.getData().toString("utf-8"));
  } catch (err) {
    throw new ApiError("bad_request", "Ошибка парсинга imsmanifest.xml: " + (err instanceof Error ? err.message : "невалидный XML"), 422);
  }

  const packageId = createId();
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  let uploadCount = 0;

  for (const entry of entries) {
    const fileName = entry.entryName.replace(/\\/g, "/");
    const contentType = getMimeType(fileName);
    const uploaded = await uploadScormFile(packageId, fileName, entry.getData(), contentType);
    if (uploaded) uploadCount++;
  }

  const entryPoint = manifest.entryPoint || "index.html";
  const entryUrl = `/api/v1/scorm/serve/${packageId}/${entryPoint}`;

  const pkg = await prisma.scormPackage.create({
    data: {
      id: packageId,
      lessonId,
      title: manifest.title,
      scormVersion: manifest.scormVersion,
      manifest: manifest as object,
      storageKey: packageId,
      entryUrl,
      status: "VALID",
    },
  });

  return {
    id: pkg.id,
    title: pkg.title,
    version: pkg.scormVersion,
    entryUrl: pkg.entryUrl,
    organizations: manifest.organizations,
    fileCount: uploadCount,
  };
}
