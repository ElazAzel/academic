import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { writeOutboxEvent } from "@/server/modules/outbox/service";
import { errorResponse, parseJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const createJobSchema = z.object({
  type: z.enum(["progress", "risk", "assignments", "certificates", "curator_workload"]),
  format: z.enum(["csv", "xlsx", "pdf"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const rl = await checkRateLimit(`reports:job:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
    }

    const payload = await parseJson(request, createJobSchema);

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
