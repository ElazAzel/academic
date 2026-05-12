import NextAuth from "next-auth";
import { authOptions } from "@/server/auth/options";
import { checkRateLimit } from "@/lib/security/rate-limit";

const handler = NextAuth(authOptions);

interface RouteContext {
  params: Promise<Record<string, string | string[]>>;
}

export async function GET(request: Request, context: RouteContext) {
  return handler(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkRateLimit(`login:ip:${ip}`);
  if (!rl.allowed) {
    return Response.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  return handler(request, context);
}

