import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { writeOutboxEvent } from "@/server/modules/outbox/service";
import { errorResponse, parseJson, ApiError } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getAvailableReportsForRoles } from "@/server/modules/reports/service";
import { z } from "zod";

const createJobSchema = z.object({
  type: z.enum(["progress", "risk", "assignments", "certificates", "curator_workload"]),
  format: z.enum(["csv", "xlsx", "pdf"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser("reports:read");

    const rl = await checkRateLimit(`reports:job:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
    }

    const payload = await parseJson(request, createJobSchema);

    // Early validation: fail fast if this report type isn't allowed for the user's role
    const allowedTypes = getAvailableReportsForRoles(user.roles).map((r) => r.type);
    if (!allowedTypes.includes(payload.type)) {
      throw new ApiError("forbidden", "Этот тип отчёта недоступен для вашей роли", 403);
    }

    const event = await writeOutboxEvent("report.generate", {
      reportType: payload.type,
      format: payload.format,
      userId: user.id,
    });

    return NextResponse.json({ jobId: event.id, status: "pending" }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
