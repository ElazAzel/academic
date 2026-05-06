import { ok } from "@/lib/http";

export function GET() {
  return ok({ status: "ok", service: "ai-strategic-academy", version: "0.1.0" });
}

