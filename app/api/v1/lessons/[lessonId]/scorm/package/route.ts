import { errorResponse, ok, empty } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { deleteScormDirectory } from "@/server/modules/scorm/storage";

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireUser("courses:write");
    const { lessonId } = await context.params;
    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return ok(null, 200);

    return ok({
      id: pkg.id,
      title: pkg.title,
      scormVersion: pkg.scormVersion,
      organizations: (pkg.manifest as { organizations?: Array<{ identifier: string; title: string }> })?.organizations ?? [],
      fileCount: 0,
      entryUrl: pkg.entryUrl,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireUser("courses:write");
    const { lessonId } = await context.params;
    const prisma = getPrisma();

    const pkg = await prisma.scormPackage.findUnique({ where: { lessonId } });
    if (!pkg) return empty(204);

    await deleteScormDirectory(pkg.id);
    await prisma.scormPackage.delete({ where: { id: pkg.id } });

    return empty(204);
  } catch (error) {
    return errorResponse(error);
  }
}
