import { ApiError, errorResponse, getSafeErrorMetadata, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

// GET /api/v1/popups/diag — diagnostic endpoint to check DB connectivity
export async function GET() {
  try {
    const user = await requireUser("settings:manage");
    const prisma = getPrisma();

    // Test 1: User query
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });

    // Test 2: AdminPopup table
    const popupCount = await prisma.adminPopup.count();

    // Test 3: Notifications table
    const notifCount = await prisma.notification.count({
      where: { userId: user.id },
    });

    // Test 4: Enrollments (count only, no PII exposure)
    const enrollmentCount = await prisma.enrollment.count({
      where: { userId: user.id },
    });

    return ok({
      userFound: !!dbUser,
      userRoles: dbUser?.roles.map((r) => r.role.key) ?? [],
      popupCount,
      notifCount,
      enrollmentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("[popups/diag] Fatal error", getSafeErrorMetadata(error));
    }
    return errorResponse(error);
  }
}
