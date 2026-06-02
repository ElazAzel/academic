import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { serveScormFile } from "@/server/modules/scorm/proxy";
import { assertScormRuntimeAccess, createScormLaunch, getScormPackageAccessContext } from "@/server/modules/scorm/service";

function isSafePath(path: string[]) {
  return path.every((part) => part.length > 0 && part !== "." && part !== ".." && !part.includes("\\"));
}

function isScormEntryPoint(filePath: string) {
  const fileName = filePath.split("/").pop()?.toLowerCase();
  return fileName === "index.html" || fileName === "index.htm";
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const user = await requireUser("courses:read");
    const { path } = await params;
    if (path.length < 2 || !isSafePath(path)) {
      return errorResponse(new ApiError("bad_request", "Некорректный путь SCORM-файла", 400));
    }

    const [packageId, ...fileParts] = path;
    const filePath = fileParts.join("/");

    const pkg = await getScormPackageAccessContext(packageId);
    if (!pkg) {
      return errorResponse(new ApiError("not_found", "SCORM-файл не найден", 404));
    }

    await assertScormRuntimeAccess(user, { lessonId: pkg.lessonId, courseId: pkg.courseId });

    let launchId: string | undefined;

    if (isScormEntryPoint(filePath)) {
      const launch = await createScormLaunch(user.id, pkg.lessonId, pkg.id);
      launchId = launch.id;
    }

    const result = await serveScormFile(packageId, filePath, launchId);
    if (!result) {
      return errorResponse(new ApiError("not_found", "SCORM-файл не найден", 404));
    }

    const cacheControl = isScormEntryPoint(filePath)
      ? "private, no-store"
      : "private, max-age=300";

    return new NextResponse(result.body as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": cacheControl,
        "X-Frame-Options": "ALLOWALL",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }

    console.error("[SCORM serve] Failed to serve file:", error);
    return errorResponse(new ApiError("internal_error", "Не удалось загрузить SCORM-файл", 500));
  }
}
