import AdmZip from "adm-zip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockScormPackageFindUnique = vi.hoisted(() => vi.fn());
const mockScormPackageCreate = vi.hoisted(() => vi.fn());
const mockUploadScormFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    scormPackage: {
      findUnique: mockScormPackageFindUnique,
      create: mockScormPackageCreate,
    },
  }),
}));

vi.mock("@/server/modules/scorm/storage", () => ({
  uploadScormFile: mockUploadScormFile,
}));

const { importScormPackage } = await import("@/server/modules/scorm/import");

function zipWithManifest(manifestXml: string) {
  const zip = new AdmZip();
  zip.addFile("imsmanifest.xml", Buffer.from(manifestXml, "utf8"));
  return zip.toBuffer();
}

beforeEach(() => {
  vi.clearAllMocks();
  mockScormPackageFindUnique.mockResolvedValue(null);
  mockScormPackageCreate.mockResolvedValue({
    id: "package-1",
    title: "SCORM-пакет",
    scormVersion: "1.2",
    entryUrl: "/api/v1/scorm/serve/package-1/index.html",
  });
  mockUploadScormFile.mockResolvedValue(true);
});

describe("importScormPackage", () => {
  it("returns a safe Russian parse error for invalid manifests", async () => {
    await expect(importScormPackage("lesson-1", zipWithManifest("<root/>"))).rejects.toMatchObject({
      code: "bad_request",
      message:
        "Ошибка парсинга imsmanifest.xml: Некорректный манифест SCORM: отсутствует корневой элемент <manifest>",
      status: 422,
    });

    expect(mockUploadScormFile).not.toHaveBeenCalled();
    expect(mockScormPackageCreate).not.toHaveBeenCalled();
  });
});
