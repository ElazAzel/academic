import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { generateReportPreview } from "@/server/modules/reports/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);

    const rl = await checkRateLimit(`reports:preview:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
    }

    const reportType = searchParams.get("type");
    const preview = await generateReportPreview({
      user,
      type: reportType,
    });

    return NextResponse.json({ data: preview });
  } catch (err) {
    console.error("Reports preview API error:", err);
    return errorResponse(err);
  }
}
