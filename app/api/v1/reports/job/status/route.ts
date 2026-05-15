import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { errorResponse, ApiError } from "@/lib/http";

const prisma = getPrisma();

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId) {
      throw new ApiError("bad_request", "jobId обязателен", 400);
    }

    const event = await prisma.outboxEvent.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, error: true, payload: true },
    });

    if (!event) {
      throw new ApiError("not_found", "Задача не найдена", 404);
    }

    const statusMap: Record<string, string> = {
      pending: "pending",
      processing: "processing",
      sent: "completed",
      failed: "failed",
    };

    const payload = event.payload as Record<string, unknown> | null;
    const downloadUrl = event.status === "sent" ? (payload?.downloadUrl as string | undefined) : undefined;

    return NextResponse.json({
      status: statusMap[event.status] ?? event.status,
      downloadUrl,
      error: event.error ?? undefined,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
