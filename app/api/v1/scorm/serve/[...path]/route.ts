import { NextResponse } from "next/server";
import { serveScormFile } from "@/server/modules/scorm/proxy";
import { createScormLaunch, getScormPackage } from "@/server/modules/scorm/service";
import { getToken } from "next-auth/jwt";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    if (path.length < 2) {
      return new NextResponse("Not found", { status: 404 });
    }

    const [packageId, ...fileParts] = path;
    const filePath = fileParts.join("/");

    const token = await getToken({ req: request as never });
    let launchId: string | undefined;

    if (token?.sub && filePath.includes("index.")) {
      const pkg = await getScormPackage(path[0] as string);
      if (pkg) {
        try {
          const launch = await createScormLaunch(token.sub, pkg.lessonId, pkg.id);
          launchId = launch.id;
        } catch {
          // Launch creation may fail if user not authenticated properly
        }
      }
    }

    const result = await serveScormFile(packageId, filePath, launchId);
    if (!result) {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(result.body as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=3600",
        "X-Frame-Options": "ALLOWALL",
      },
    });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
