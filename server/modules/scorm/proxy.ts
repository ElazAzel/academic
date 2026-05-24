import { getPrisma } from "@/lib/prisma";
import { downloadScormFile } from "./storage";
import { getScorm12Bridge, getScorm2004Bridge } from "./api-bridge";

const MIME_OVERRIDES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function findScormPackage(packageId: string) {
  const prisma = getPrisma();
  return prisma.scormPackage.findUnique({ where: { id: packageId } });
}

export async function serveScormFile(packageId: string, filePath: string, launchId?: string) {
  const pkg = await findScormPackage(packageId);
  if (!pkg) return null;

  const storagePath = `${packageId}/${filePath}`;
  const result = await downloadScormFile(storagePath);
  if (!result) return null;

  const ext = filePath.split(".").pop()?.toLowerCase();
  const contentType = MIME_OVERRIDES[`.${ext}`] || result.contentType;

  if (ext === "html" || ext === "htm") {
    const text = await new Response(result.data).text();
    const bridge = pkg.scormVersion === "2004"
      ? getScorm2004Bridge(
          launchId || "",
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/init`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}`,
        )
      : getScorm12Bridge(
          launchId || "",
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/init`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}/cmi`,
          `/api/v1/lessons/${pkg.lessonId}/scorm/launch/${launchId || ""}`,
        );

    const injected = text.replace("</head>", `<script>${bridge}</script></head>`);
    return { body: injected, contentType };
  }

  return { body: result.data, contentType };
}
